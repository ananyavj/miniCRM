# MiniCRM Data Model

## One sentence
MiniCRM is software that many **organizations** (sales companies) use at the same time. Each organization's **users** (its employees) track their **leads** (prospective customers), the extra **contacts** connected to each lead, and the **deals** (possible sales) with each lead. Organizations must never see each other's data.

## Two worlds: do not mix them up
| World | Tables | Meaning |
|---|---|---|
| **Our software's customers and their staff** | `organizations`, `users` | Who uses MiniCRM and logs in. |
| **The data those customers keep about THEIR customers** | `leads`, `contacts`, `deals` | What the sales team is working on. |

A user is never a lead or a contact. Alice (a user of Acme Sales) is an employee who works in the CRM. Rahul (a lead of Acme Sales) is a prospect Acme is trying to sell to.

## The tables
| Table | One row is... | Example | Key columns |
|---|---|---|---|
| `organizations` | one company that uses MiniCRM (a tenant) | "Acme Sales Ltd" | id, name |
| `users` | one employee of an organization | Alice, works at Acme Sales | id, organization_id, name, email |
| `leads` | one prospective customer the organization is tracking: a person, with the company they work for written as plain text | Rahul Sharma, company "Infosys", status `qualified` | id, organization_id, name, email, phone, company, status, assigned_to |
| `contacts` | another person connected to a lead | Priya Mehta, Rahul's director, whom the team also talks to | id, organization_id, lead_id, name, email, phone |
| `deals` (Day 19) | one possible sale tied to a lead, with a value and a stage | "Website redesign", 5,000,000 cents, stage `negotiation` | id, organization_id, lead_id, title, value_cents, stage |

## How they connect
```
organizations 1 ---- N users
organizations 1 ---- N leads
users         1 ---- N leads     (leads.assigned_to: which employee owns the lead; may be empty)
leads         1 ---- N contacts
leads         1 ---- N deals
```
- Every table carries `organization_id`, so every query can say "only this organization's rows".
- `contacts` and `deals` belong to a lead through `lead_id`. Three contacts for lead 5 simply means three contact rows with `lead_id = 5`.
- The **composite foreign keys** `(lead_id, organization_id)` and `(assigned_to, organization_id)` make it impossible, at database level, to link a row to a lead or user from another organization.

## Worked example with two organizations
Organization 1 "Acme Sales":
- users: Alice (id 1)
- leads: Rahul Sharma (id 5, assigned to Alice), Priya Mehta (id 6)
- contacts of lead 5: Amit Patel (101), Sneha Joshi (102)
- deals of lead 5: "Website redesign" (stage `proposal`)

Organization 2 "Beta Corp":
- users: Bob (id 2)
- leads: Karan Shah (id 7)

Acme sends `GET /leads/7` and gets 404, because lead 7 is not in Acme's organization. Acme cannot assign lead 5 to Bob (user 2), because Bob is not in Acme.

## Why contacts exist at all
A lead is the one prospect you track and have a status for. Real prospects usually involve several people: the person who enquired, their manager who approves, someone in IT. Contacts let the team store those extra people against the same lead without creating extra leads that would each have their own status and sales pipeline.

## Deliberate simplifications (not mistakes, just scope)
- `leads.company` is plain text. There is no `companies` table, so two leads that work at the same company are not linked.
- Leads do not "convert" into contacts (some CRMs, such as Zoho, do that). In MiniCRM a contact is always an extra person attached to an existing lead.
- Users and contacts are never linked.
- Deals attach to leads only, not to contacts.
