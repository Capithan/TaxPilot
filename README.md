# TaxPilot - Intelligent Tax Client Intake MCP Server

An intelligent MCP (Model Context Protocol) server for tax professionals that streamlines client intake, automates document collection, and optimizes appointment scheduling with **guided conversation flow management**.

## 🎯 Problem Solved

**40% of clients arrive unprepared**, wasting valuable tax professional time. This solution provides:

- **Guided conversation flow** - Ensures consistent experience from intake to appointment
- **Pre-appointment intelligent assistant** - Conversational intake collects all info before appointment
- **Auto-generated personalized document checklists** - Based on client's specific tax situation
- **Smart reminders** - "Don't forget your 1099-NEC from Uber"
- **Intelligent routing** - Routes to right tax pro based on complexity

**Impact: 30-min appointments → 15-min, 2x throughput**

## 🚀 Features

### 1. Conversation Flow Management
The system maintains a consistent 10-stage conversation flow:

| Stage | Description |
|-------|-------------|
| `welcome` | Greet client and initialize session |
| `intake_questions` | Collect personal, filing, income, deduction info |
| `summary_review` | Present summary of collected information |
| `summary_confirmation` | Client confirms or requests edits |
| `document_checklist` | Generate and present required documents |
| `availability_inquiry` | Collect scheduling preferences |
| `taxpro_routing` | Match with appropriate tax professional |
| `appointment_scheduling` | Book the appointment |
| `reminders_setup` | Configure appointment reminders |
| `complete` | Flow complete, ready for appointment |

### 2. Conversational Intake
- Step-by-step guided intake process
- Collects personal info, filing status, spouse info (if married), dependents, income types, deductions
- Identifies special situations (crypto, foreign accounts, rental properties)
- Progress tracking and session management

### 3. Smart Document Checklist
- Automatically generates personalized document lists
- Based on income types (W-2, 1099-NEC, investments, crypto)
- Tracks collected vs pending documents
- Includes specific sources (e.g., "Download from Uber driver dashboard")

### 4. Intelligent Reminders
- Personalized reminder messages
- Context-aware notifications
- Multi-channel support (email/SMS)
- Appointment reminders at 24h and 1h before

### 5. Tax Professional Routing
- Complexity scoring (0-100 scale)
- Matches clients to specialists based on:
  - Complexity level (simple, moderate, complex, expert)
  - Required specializations (crypto, foreign income, real estate, etc.)
  - Tax pro availability and ratings
- Alternative recommendations

### 6. Appointment Optimization
- Dynamic duration based on complexity and intake completion
- Time savings tracking (e.g., "Save 15 minutes with completed intake")
- Automatic reminder scheduling

## 📦 Installation

```bash
git clone https://github.com/Capithan/TaxPilot.git
cd TaxPilot
npm install
npm run build
```

## ☁️ Deployment

### Azure Web App

See [AZURE_DEPLOY.md](AZURE_DEPLOY.md) for complete deployment instructions including:
- Azure CLI deployment
- GitHub Actions CI/CD
- VS Code Azure extension deployment

### Local Development

```bash
npm run build
node dist/index.js
```

## 🔧 Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tax-intake": {
      "command": "node",
      "args": ["/path/to/TaxPilot/dist/index.js"]
    }
  }
}
```

### For Other MCP Clients

The server uses stdio transport. Run with:

```bash
node dist/index.js
```

## 🛠️ Available Tools

### Flow Management Tools
| Tool | Description |
|------|-------------|
| `get_conversation_flow` | Get current flow state and next actions |
| `advance_conversation_flow` | Move to next stage in the flow |
| `confirm_intake_summary` | Confirm or request edits to summary |
| `set_scheduling_preferences` | Set client's availability preferences |
| `select_tax_professional` | Select a tax professional for routing |
| `get_flow_progress` | Get visual progress of conversation flow |

### Intake Tools
| Tool | Description |
|------|-------------|
| `start_intake` | Start a new client intake session |
| `process_intake_response` | Process client's answer during intake |
| `get_intake_progress` | Check intake completion status |
| `get_client_summary` | Get complete client information |

### Document Checklist Tools
| Tool | Description |
|------|-------------|
| `generate_document_checklist` | Create personalized document list |
| `get_document_checklist` | Retrieve current checklist |
| `mark_document_collected` | Mark document as received |
| `get_pending_documents` | List outstanding documents |

### Reminder Tools
| Tool | Description |
|------|-------------|
| `create_document_reminders` | Create personalized reminders |
| `get_client_reminders` | View all reminders |
| `send_reminder` | Send a specific reminder |

### Routing Tools
| Tool | Description |
|------|-------------|
| `calculate_complexity` | Get complexity score (0-100) |
| `route_to_tax_pro` | Auto-assign best tax professional |
| `get_tax_pro_recommendations` | Get recommended tax pros |
| `create_appointment` | Schedule an appointment |
| `get_appointment_estimate` | Get time estimate & savings |

### Utility Tools
| Tool | Description |
|------|-------------|
| `list_tax_professionals` | View all available tax pros |
| `get_client` | Get client profile |

## 📝 Conversation Flow Example

### Complete Flow Walkthrough

```
1. WELCOME
   → System greets client, initializes session

2. INTAKE QUESTIONS
   → Personal info, filing status, spouse (if married), dependents
   → Employment, income types, deductions, special situations

3. SUMMARY REVIEW
   → "Here's what I collected: Name: John Smith, Filing: MFJ..."

4. SUMMARY CONFIRMATION
   → Client confirms or requests edits

5. DOCUMENT CHECKLIST
   → "Based on your situation, you'll need: W-2, 1099-NEC..."

6. AVAILABILITY INQUIRY
   → "When are you available? Weekday mornings, evenings...?"

7. TAX PRO ROUTING
   → "Based on your crypto income, I recommend Michael Chen..."

8. APPOINTMENT SCHEDULING
   → "Booking Tuesday at 2pm with Michael Chen..."

9. REMINDERS SETUP
   → "You'll receive reminders 24h and 1h before..."

10. COMPLETE
    → "All set! See you at your appointment."
```

## 🏗️ Architecture

```
TaxPilot/
├── src/
│   ├── index.ts              # MCP Server entry point & tool definitions
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   └── client.ts         # TypeScript interfaces & flow types
│   ├── database/
│   │   └── index.ts          # In-memory database
│   └── services/
│       ├── index.ts          # Service exports
│       ├── flowManager.ts    # Conversation flow management
│       ├── intake.ts         # Intake conversation logic
│       ├── checklist.ts      # Document checklist generator
│       ├── reminders.ts      # Reminder system
│       ├── routing.ts        # Tax pro matching & routing
│       └── taxproLoader.ts   # Tax professional data loader
├── api/
│   └── bridge.ts             # HTTP bridge for web deployment
├── public/
│   ├── index.html            # Web interface
│   └── openapi.yaml          # API specification
├── package.json
├── tsconfig.json
├── AZURE_DEPLOY.md           # Azure deployment guide
└── README.md
```

## 🔮 Future Enhancements

- [ ] Persistent database (Azure SQL/CosmosDB)
- [ ] Email/SMS integration (SendGrid, Twilio)
- [ ] Calendar integration (Microsoft 365, Google Calendar)
- [ ] Document upload and OCR
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Client portal

## 📊 Complexity Scoring

| Level | Score Range | Description |
|-------|-------------|-------------|
| Simple | 0-20 | W-2 only, standard deductions |
| Moderate | 21-50 | Multiple income sources, itemized deductions |
| Complex | 51-80 | Business income, rental properties |
| Expert | 81-100 | Foreign accounts, crypto, audit representation |

## 🤝 Tax Professional Specializations

- Individual Returns
- Self-Employment
- Small Business
- Investments
- Real Estate
- Cryptocurrency
- Foreign Income
- Estate Planning
- Audit Representation

## 📄 License

MIT License
