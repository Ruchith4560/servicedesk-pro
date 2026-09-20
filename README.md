# ServiceDesk Pro
> **AI-Powered IT Service Management & Asset Intelligence Platform**

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248.svg)](https://www.mongodb.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-red.svg)](https://qdrant.tech/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ServiceDesk Pro is an enterprise IT Service Management (ITSM) and Asset Intelligence Platform engineered to connect employee service requests, deterministic SLA management, hardware/software asset context, and evidence-grounded AI recommendations into a unified, auditable operational workflow.

---

## Architecture Overview

```
Employee Issue Report
  ↓
Schema Validation & Intake
  ↓
AI & Deterministic Triage (Category, Priority, Risk Score)
  ↓
SLA Policy Binding (Deadlines, Business Hours)
  ↓
Intelligent Skill/Workload Routing
  ↓
Technician Hero Workspace
  ↓
Asset Context Linkage (Hardware/Warranty/Incident History)
  ↓
RAG Knowledge Retrieval (Approved KB Chunks + Citations)
  ↓
Human-in-the-Loop Investigation & Resolution
  ↓
State Machine Transition to Closed
  ↓
Immutable Audit Trail & Managerial Analytics
```

---

## Key Features

1. **Role-Based Access Control (RBAC)**:
   - Server-enforced permissions across 5 roles: `System Admin`, `IT Manager`, `Technician`, `Employee`, `Asset Manager`.
   - Department-scoped resource isolation and ownership validation.
2. **Deterministic Ticket State Machine**:
   - 8 strictly guarded states: `Open` → `Triaged` → `Assigned` → `In Progress` → `Waiting` → `Resolved` → `Closed` (with `Reopened` support).
   - Complete event trail recording actors, old/new values, and timestamps.
3. **Enterprise SLA Engine**:
   - Business-hour calculation, automatic pause on `Waiting` states, threshold warnings, and automated escalations.
4. **Asset Lifecycle Management**:
   - Complete tracking (`Procured` → `In Stock` → `Assigned` → `Under Repair` → `Retired`), warranty tracking, and incident correlation.
5. **Knowledge Base & RAG Assistant**:
   - Editorial workflow (`Draft` → `In Review` → `Approved` → `Published`).
   - Semantic chunking, vector indexing in Qdrant, RBAC-filtered retrieval, and grounded LLM answers with chunk citations.
6. **Technician Hero Workspace**:
   - High-density 3-column operational cockpit bringing conversation, investigation logs, asset health, SLA countdowns, and RAG suggestions into one screen.
7. **Empirical AI Evaluation**:
   - Transparent evaluation scripts for ticket classification ($F_1$, confusion matrix) and RAG retrieval (Recall@K, Groundedness).

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand, Lucide Icons, Vite |
| **Core Backend** | Node.js, Express.js, Mongoose (MongoDB), Zod Validation, JWT, Winston |
| **AI Microservice** | Python 3.11+, FastAPI, Pydantic, Scikit-learn, Qdrant Client, Google GenAI SDK |
| **Datastores** | MongoDB (Primary Document Store), Qdrant (Vector Database) |
| **DevOps** | Docker, Docker Compose, GitHub Actions |

---

## Directory Structure

```
servicedesk-pro/
├── client/              # React + TypeScript + Vite frontend application
├── server/              # Node.js + Express REST API core backend
├── ai-service/          # Python + FastAPI microservice (Classifier & RAG)
├── docker/              # Docker configuration files
├── scripts/             # Database seeders, benchmark & evaluation runners
├── .github/workflows/   # CI/CD pipeline automation
├── docker-compose.yml   # Multi-container local orchestration
├── .env.example         # Environment configuration template
└── README.md
```

---

## Quickstart (Local Development)

### Prerequisites
- Node.js v20+ and npm
- Python 3.11+
- Docker & Docker Compose (or local MongoDB + Qdrant instances)

### Setup Instructions
1. Clone repository:
   ```bash
   git clone https://github.com/Ruchith4560/servicedesk-pro.git
   cd servicedesk-pro
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Run with Docker Compose:
   ```bash
   docker compose up --build
   ```

---

## Development Roadmap & Status

- [x] **Phase 0**: Architecture, Scope & Git Setup
- [ ] **Phase 1**: Project Foundation & Docker Orchestration
- [ ] **Phase 2**: Authentication & RBAC Engine
- [ ] **Phase 3**: Ticket Lifecycle & Finite State Machine
- [ ] **Phase 4**: Deterministic SLA Engine & Background Scheduling
- [ ] **Phase 5**: Asset Management & Incident Correlation
- [ ] **Phase 6**: Knowledge Base & Editorial Workflow
- [ ] **Phase 7**: AI Ticket Classification & Model Evaluation
- [ ] **Phase 8**: RAG Knowledge Assistant & Citation Engine
- [ ] **Phase 9**: Intelligent Routing & Deterministic Risk Indicator
- [ ] **Phase 10**: Hero Screen — Technician Workspace
- [ ] **Phase 11**: Dashboards & Analytics
- [ ] **Phase 12**: Notifications & System Audit Trail
- [ ] **Phase 13**: Testing & Security Hardening
- [ ] **Phase 14**: Performance Optimization
- [ ] **Phase 15**: Production Deployment
- [ ] **Phase 16**: Portfolio Artifacts & Interview Preparation
