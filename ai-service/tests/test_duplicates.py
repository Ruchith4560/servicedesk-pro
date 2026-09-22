from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_detect_duplicate_incidents_exact_and_high():
    target = {
        "id": "60d5ec49f1b2c8b1f8e4e1a1",
        "ticketId": "SDP-1001",
        "title": "VPN connection drops every 5 minutes",
        "description": "AnyConnect VPN client repeatedly disconnects while working remotely.",
        "category": "NETWORK"
    }

    candidates = [
        {
            "id": "60d5ec49f1b2c8b1f8e4e1a2",
            "ticketId": "SDP-1002",
            "title": "VPN connection drops frequently",
            "description": "AnyConnect remote VPN client keeps disconnecting every few minutes.",
            "category": "NETWORK"
        },
        {
            "id": "60d5ec49f1b2c8b1f8e4e1a3",
            "ticketId": "SDP-1003",
            "title": "Need second 4K monitor on desk",
            "description": "Procure an extra Dell UltraSharp 27 inch display for workstation.",
            "category": "HARDWARE"
        }
    ]

    response = client.post(
        "/api/v1/clustering/detect-duplicates",
        json={
            "target": target,
            "candidates": candidates,
            "threshold": 0.50
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_candidates_analyzed"] == 2
    assert data["is_clustered"] is True
    assert len(data["duplicates"]) >= 1

    top_duplicate = data["duplicates"][0]
    assert top_duplicate["id"] == "60d5ec49f1b2c8b1f8e4e1a2"
    assert top_duplicate["ticketId"] == "SDP-1002"
    assert top_duplicate["similarity_score"] >= 0.50
    assert top_duplicate["match_level"] in ["HIGH", "EXACT", "MEDIUM"]

def test_detect_duplicate_incidents_no_match():
    target = {
        "id": "60d5ec49f1b2c8b1f8e4e1a1",
        "ticketId": "SDP-1001",
        "title": "MacBook battery swelling",
        "description": "Trackpad is lifting due to swollen lithium-ion battery.",
        "category": "HARDWARE"
    }

    candidates = [
        {
            "id": "60d5ec49f1b2c8b1f8e4e1a4",
            "ticketId": "SDP-1004",
            "title": "Email password expired",
            "description": "Please reset my Active Directory password for Outlook.",
            "category": "ACCESS_IAM"
        }
    ]

    response = client.post(
        "/api/v1/clustering/detect-duplicates",
        json={
            "target": target,
            "candidates": candidates,
            "threshold": 0.70
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_candidates_analyzed"] == 1
    assert data["is_clustered"] is False
    assert len(data["duplicates"]) == 0
