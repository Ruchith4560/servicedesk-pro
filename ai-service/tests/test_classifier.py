from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_with_models():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["models_loaded"] is True

def test_classify_network_ticket():
    payload = {
        "title": "Cisco AnyConnect VPN disconnected and failed to connect",
        "description": "Unable to establish secure SSL tunnel to vpn.servicedesk.local gateway. Network routes unreachable."
    }
    response = client.post("/api/v1/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "NETWORK"
    assert 0.0 <= data["category_confidence"] <= 1.0
    assert "vpn" in [k.lower() for k in data["top_keywords"]]
    assert any("VPN" in s or "Networking" in s for s in data["suggested_skills"])
    assert data["predicted_priority"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def test_classify_hardware_ticket():
    payload = {
        "title": "MacBook Pro laptop battery swollen and keyboard bulging",
        "description": "Noticeable physical bulge under keyboard frame. Battery swelling is pushing the trackpad out."
    }
    response = client.post("/api/v1/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "HARDWARE"
    assert "HARDWARE" in data["category_probabilities"]
    assert any("Hardware" in s or "Laptop" in s for s in data["suggested_skills"])

def test_classify_security_ticket_triggers_manual_triage():
    payload = {
        "title": "CRITICAL: Urgent phishing email with ransomware macro attachment",
        "description": "EMERGENCY: Employee in finance opened urgent_invoice.docm from suspicious spoofed sender. Trojan detected."
    }
    response = client.post("/api/v1/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "SECURITY"
    assert data["predicted_priority"] == "CRITICAL"
    assert data["requires_manual_triage"] is True
    assert "security" in data["triage_reason"].lower()

def test_classify_access_ticket():
    payload = {
        "title": "Active Directory Windows domain password expired and locked out",
        "description": "Entered wrong password 5 times after weekend. Account is locked out and cannot log in."
    }
    response = client.post("/api/v1/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "ACCESS_IAM"
    assert "ACCESS_IAM" in data["category_probabilities"]

def test_get_model_metrics():
    response = client.get("/api/v1/model-metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["category_accuracy"] > 0.8
    assert data["sample_count"] == 125
    assert "labels" in data["confusion_matrix_category"]
    assert len(data["confusion_matrix_category"]["labels"]) == 5

def test_classify_validation_error():
    # Description too short
    payload = {
        "title": "Broken",
        "description": "bad"
    }
    response = client.post("/api/v1/classify", json=payload)
    assert response.status_code == 422
