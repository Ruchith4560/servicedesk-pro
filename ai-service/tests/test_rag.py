from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_CHUNKS = [
    {
        "articleId": "507f1f77bcf86cd799439011",
        "articleCode": "KB-1001",
        "chunkIndex": 0,
        "heading": "Cisco AnyConnect VPN Setup",
        "chunkText": "Open AnyConnect and connect to vpn.servicedesk.local gateway. Enter your corporate email and password, then approve the MFA push notification.",
        "accessRoles": ["EMPLOYEE", "TECHNICIAN", "IT_MANAGER", "SYSTEM_ADMIN"],
        "contentHash": "hash1001_0"
    },
    {
        "articleId": "507f1f77bcf86cd799439011",
        "articleCode": "KB-1001",
        "chunkIndex": 1,
        "heading": "Error: Certificate Validation Failed (Code 403)",
        "chunkText": "If error 403 certificate validation failure occurs, verify system clock synchronization. Open certmgr.msc and confirm Corporate Root CA 2024 is in Trusted Root Certification Authorities. Restart vpnagent.exe service.",
        "accessRoles": ["EMPLOYEE", "TECHNICIAN", "IT_MANAGER", "SYSTEM_ADMIN"],
        "contentHash": "hash1001_1"
    },
    {
        "articleId": "507f1f77bcf86cd799439022",
        "articleCode": "KB-1004",
        "chunkIndex": 0,
        "heading": "PostgreSQL Production Failover SOP",
        "chunkText": "Execute patronictl -c /etc/patroni/patroni.yml switchover --master pg-node-01 --candidate pg-node-02. HAProxy will transparently redirect active write connections within 3 seconds.",
        "accessRoles": ["TECHNICIAN", "IT_MANAGER", "SYSTEM_ADMIN"],
        "contentHash": "hash1004_0"
    }
]

def test_index_and_retrieve_chunks():
    # 1. Index test chunks
    index_res = client.post("/api/v1/rag/index", json={"chunks": SAMPLE_CHUNKS})
    assert index_res.status_code == 200
    assert index_res.json()["indexed_count"] == 3

    # 2. Query as Employee for VPN troubleshooting
    query_res = client.post("/api/v1/rag/query", json={
        "query": "How do I fix VPN certificate validation error code 403?",
        "user_role": "EMPLOYEE"
    })
    assert query_res.status_code == 200
    data = query_res.json()
    assert data["has_sufficient_context"] is True
    assert len(data["citations"]) > 0
    assert any(c["articleCode"] == "KB-1001" for c in data["citations"])
    assert "KB-1001" in data["answer"]
    assert "certmgr.msc" in data["answer"] or "clock" in data["answer"] or "vpnagent" in data["answer"]

def test_rbac_security_isolation_in_vector_search():
    # Employee query for confidential internal database failover SOP -> MUST BE BLOCKED/ISOLATED
    emp_query = client.post("/api/v1/rag/query", json={
        "query": "How to execute patronictl switchover database failover?",
        "user_role": "EMPLOYEE"
    })
    assert emp_query.status_code == 200
    emp_data = emp_query.json()
    # Ensure confidential chunk KB-1004 is NOT returned to Employee
    assert all(c["articleCode"] != "KB-1004" for c in emp_data["citations"])

    # Technician query for the same runbook -> MUST BE RETRIEVED
    tech_query = client.post("/api/v1/rag/query", json={
        "query": "How to execute patronictl switchover database failover?",
        "user_role": "TECHNICIAN"
    })
    assert tech_query.status_code == 200
    tech_data = tech_query.json()
    assert tech_data["has_sufficient_context"] is True
    assert any(c["articleCode"] == "KB-1004" for c in tech_data["citations"])
    assert "KB-1004" in tech_data["answer"]

def test_rag_insufficient_context_fallback():
    # Query completely unrelated to IT support
    query_res = client.post("/api/v1/rag/query", json={
        "query": "How to bake sourdough bread using Martian volcanic soil?",
        "user_role": "EMPLOYEE"
    })
    assert query_res.status_code == 200
    data = query_res.json()
    assert data["has_sufficient_context"] is False
    assert len(data["citations"]) == 0
    assert "No relevant standard operating procedure" in data["answer"] or "escalate" in data["answer"].lower()

def test_delete_article_vectors():
    del_res = client.delete("/api/v1/rag/articles/507f1f77bcf86cd799439022")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"
