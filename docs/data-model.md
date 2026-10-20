# MiniCRM Data Model

## One sentence
MiniCRM is software that many **organizations** (sales companies) use at the same time. Each organization's **users** (its employees) track their **leads** (prospective customers), the extra **contacts** connected to each lead, and the **deals** (possible sales) with each lead. Organizations must never see each other's data.

## Reference example (use ONLY this in all docs, tests and explanations)
Every example in this project's documentation uses this one dataset. Each name appears in exactly one role, so a name never means two different things. If you need a new example, add a row here first and reuse it everywhere.

| Table | id | Name / title | Details |
|---|---|---|---|
| organizations | 1 | Alpha Sales | tenant 1 |
| organizations | 2 | Beta Corp | tenant 2 |
| users | 1 | Alice | staff of Alpha Sales |
| users | 2 | Karan | staff of Alpha Sales |
| users | 3 | Bob | staff of Beta Corp |
| leads | 5 | Rahul Sharma | Alpha Sales, company "Infosys", assigned to Alice |
| leads | 6 | Neha Kulkarni | Alpha Sales, company "TCS", not assigned |
| leads | 7 | Sameer Shah | Beta Corp, company "Wipro" |
| contacts | 101 | Priya Nair | belongs to lead 5 (Rahul's director, approves the budget) |
| contacts | 102 | Amit Patel | belongs to lead 5 (Rahul's IT manager) |
| deals | 1 | Cloud migration project | belongs to lead 5, value 50,000, stage `negotiation` |

Rules for the example: a user is never a lead or a contact, and a contact is never also a lead. These names are all different people.

## Two worlds: do not mix them up
| World | Tables | Meaning |
|---|---|---|
| **Our software's customers and their staff** | `organizations`, `users` | Who uses MiniCRM and logs in. |
| **The data those customers keep about THEIR customers** | `leads`, `contacts`, `deals` | What the sales team is working on. |

Alice (a user of Alpha Sales) is an employee who works in the CRM. Rahul (a lead of Alpha Sales) is a prospect Alpha is trying to sell to.

## The tables
| Table | One row is... | Example | Key columns |
|---|---|---|---|
| `organizations` | one company that uses MiniCRM (a tenant) | Alpha Sales | id, name |
| `users` | one employee of an organization | Alice, works at Alpha Sales | id, organization_id, name, email |
| `leads` | one prospective customer the organization is tracking: a person, with the company they work for written as plain text | Rahul Sharma, company "Infosys", status `qualified` | id, organization_id, name, email, phone, company, status, assigned_to |
| `contacts` | another person connected to a lead | Priya Nair, Rahul's director, whom the team also talks to | id, organization_id, lead_id, name, email, phone |
| `deals` | one possible sale tied to a lead, with a value and a stage | "Cloud migration project", 50,000, stage `negotiation` | id, organization_id, lead_id, title, value_cents, stage |

## How they connect
```
organizations 1 ---- N users
organizations 1 ---- N leads
users         1 ---- N leads     (leads.assigned_to: which employee owns the lead; may be empty)
leads         1 ---- N contacts
leads         1 ---- N deals
```
- Every table carries `organization_id`, so every query can say "only this organization's rows".
- `contacts` and `deals` belong to a lead through `lead_id`. Two contacts for lead 5 simply means two contact rows with `lead_id = 5`.
- The **composite foreign keys** `(lead_id, organization_id)` and `(assigned_to, organization_id)` make it impossible, at database level, to link a row to a lead or user from another organization.

## Isolation using the reference example
Alpha Sales (org 1) sends `GET /leads/7` and gets 404, because lead 7 (Sameer Shah) is in Beta Corp. Alpha cannot assign lead 5 to Bob (user 3), because Bob is not in Alpha Sales.

## Why contacts exist at all
A lead is the one prospect you track and have a status for. Real prospects usually involve several people: the person who enquired, their manager who approves, someone in IT. Contacts let the team store those extra people against the same lead without creating extra leads that would each have their own status and sales pipeline.

## Deliberate simplifications (not mistakes, just scope)
- `leads.company` is plain text. There is no `companies` table, so two leads that work at the same company are not linked.
- Leads do not "convert" into contacts (some CRMs, such as Zoho, do that). In MiniCRM a contact is always an extra person attached to an existing lead.
- Users and contacts are never linked.
- Deals attach to leads only, not to contacts.
