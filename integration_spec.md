# Prime Blazar: External Stream Integration Specification

This document defines the interface for external systems (e.g., Telecom Showcase) to stream telemetry data into the Prime Blazar Quantum Guru optimization engine.

---

## 1. Connectivity & Security

### API Endpoint
- **Method**: `POST`
- **URL**: `https://[YOUR_DOMAIN]/api/v1/stream/inbound`

### Required Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Standard JSON format |
| `X-API-Key` | `YOUR_API_KEY` | Unique Enterprise Key from the Dashboard |

### Security Measures
1. **RBAC**: Only users with the `enterprise` role can authenticate.
2. **Idempotency**: Requests are cached for 10 seconds based on `call_id`. Duplicate requests within this window will return the cached result instead of re-executing.
3. **CORS**: Supports `Access-Control-Allow-Origin: *` for frontend-to-backend communication.

---

## 2. Request Schema

### Root Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `pipelineId` | `String` | **Yes** | The ID of the pipeline to trigger. |
| `payload` | `Object` | **Yes** | The data container for optimization. |

### Payload Object
The `payload` object is the data container for the optimization problem. Its internal structure is **dynamic** and depends entirely on the specific Quantum Blueprint linked to your `pipelineId`.

#### Generic Requirements
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `[primary_key]` | `Object/Array` | **Yes** | The core data to be optimized. |
| `[metadata_keys]` | `String/Number` | No | Supporting metadata for scoring and analysis. |

*Note: Please refer to your specific Industry Blueprint in the Prime Blazar Administrator Console to see the exact field requirements for your pipeline.*

---

## 3. Data Processing & Response
1. **Synchronous Response**: Returns `{"success": true, "shotIds": [...]}` upon successful ingestion.
2. **Asynchronous Webhook**: Once the Quantum calculation is complete, the results are POSTed to the Webhook URL configured in the Data Pipeline.
3. **DLQ Support**: If the Webhook delivery fails, the result is saved in the Dead Letter Queue for manual/automated healing.
