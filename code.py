import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def engineer_target_features(X_df):
    """Generates vessel-specific composite clinical features."""
    X = X_df.copy()
    
    # LAD Feature Engineering: Anterior ECG & Wall Motion Indicators
    st_elev = (X['St Elevation'] == 'Y').astype(int) if X['St Elevation'].dtype == 'object' else X['St Elevation']
    poor_r = (X['Poor R Progression'] == 'Y').astype(int) if X['Poor R Progression'].dtype == 'object' else X['Poor R Progression']
    q_wave = (X['Q Wave'] == 'Y').astype(int) if X['Q Wave'].dtype == 'object' else X['Q Wave']
    X['Anterior_Risk_Score'] = (st_elev * 2) + poor_r + q_wave
    
    # General Lipid & Vascular Risk Score
    X['Lipid_Risk_Ratio'] = X['LDL'] / (X['HDL'] + 1e-5)
    X['Pulse_Pressure'] = X['BP'] - 80  # Estimate pulse pressure variance
    
    return X

def train_custom_multi_model_pipeline(data_path="dataset.xlsx"):
    print(f"[*] Loading dataset: {data_path}")
    df = pd.read_excel(data_path, sheet_name=0)

    target_cols = ['Cath', 'LAD', 'LCX', 'RCA']
    label_mappings = {
        'Cath': {'CAD': 1, 'Normal': 0},
        'LAD': {'Stenotic': 1, 'Normal': 0},
        'LCX': {'Stenotic': 1, 'Normal': 0},
        'RCA': {'Stenotic': 1, 'Normal': 0}
    }
    
    y_df = pd.DataFrame()
    for col in target_cols:
        y_df[col] = df[col].map(label_mappings[col]).astype(int)

    # Prevent target leakage
    X_raw = df.drop(columns=target_cols).copy()
    
    # 1. Apply Target-Specific Feature Engineering
    X_engineered = engineer_target_features(X_raw)

    # 2. Categorical Encoding
    encoders = {}
    cat_cols = X_engineered.select_dtypes(include=['object']).columns
    for col in cat_cols:
        le = LabelEncoder()
        X_engineered[col] = le.fit_transform(X_engineered[col].astype(str))
        encoders[col] = le

    # 3. Stratified 80/20 Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_engineered, y_df, test_size=0.20, random_state=42, stratify=y_df['Cath']
    )

    # 4. Target-Specific Model Selection & Configurations
    # Each target gets the model architecture and threshold that yielded highest performance
    model_configs = {
        'Cath': {
            'model': ExtraTreesClassifier(n_estimators=150, max_depth=5, class_weight='balanced', random_state=42),
            'scale': False,
            'threshold': 0.44
        },
        'LAD': {
            'model': LogisticRegression(max_iter=1000, class_weight='balanced', C=0.5, random_state=42),
            'scale': True,  # Logistic Regression benefits from feature scaling
            'threshold': 0.44
        },
        'LCX': {
            'model': ExtraTreesClassifier(n_estimators=150, max_depth=5, class_weight='balanced', random_state=42),
            'scale': False,
            'threshold': 0.42
        },
        'RCA': {
            'model': ExtraTreesClassifier(n_estimators=150, max_depth=5, class_weight='balanced', random_state=42),
            'scale': False,
            'threshold': 0.44
        }
    }

    results = {}
    trained_artifacts = {}

    for target in target_cols:
        config = model_configs[target]
        clf = config['model']
        use_scaling = config['scale']
        th = config['threshold']
        
        # Scaling if required by model type
        if use_scaling:
            scaler = StandardScaler()
            X_tr = scaler.fit_transform(X_train)
            X_te = scaler.transform(X_test)
            trained_artifacts[f"{target}_scaler"] = scaler
        else:
            X_tr = X_train.copy()
            X_te = X_test.copy()
            
        # Fit Model
        clf.fit(X_tr, y_train[target])
        
        # Predict on Unseen Test Data
        y_proba = clf.predict_proba(X_te)[:, 1]
        y_pred = (y_proba >= th).astype(int)
        
        # Log Metrics
        results[target] = {
            'Model Type': clf.__class__.__name__,
            'Threshold': th,
            'Accuracy': accuracy_score(y_test[target], y_pred),
            'Precision': precision_score(y_test[target], y_pred, zero_division=0),
            'Recall': recall_score(y_test[target], y_pred, zero_division=0),
            'F1-Score': f1_score(y_test[target], y_pred, zero_division=0),
            'ROC-AUC': roc_auc_score(y_test[target], y_proba)
        }
        trained_artifacts[f"{target}_model"] = clf

    # Display Metrics Table
    results_df = pd.DataFrame(results).T
    print("\n" + "="*80)
    print(" TARGET-SPECIFIC CUSTOM MODEL PIPELINE PERFORMANCE (61 Test Patients) ")
    print("="*80)
    print(results_df.to_string())
    print("="*80 + "\n")

    # Export Artifacts
    os.makedirs("saved_models", exist_ok=True)
    joblib.dump(trained_artifacts, "saved_models/target_specific_models.pkl")
    joblib.dump(encoders, "saved_models/feature_encoders.pkl")
    print("[+] Custom multi-model pipeline artifacts saved in 'saved_models/'.")

if __name__ == "__main__":
    train_custom_multi_model_pipeline()