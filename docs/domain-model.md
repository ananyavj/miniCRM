# MiniCRM Domain Model

This document says what each table MEANS in the business, not just how it is built.

## The big idea: two sides

A CRM is software that a company uses to track the people it wants to sell to.

- **Our side (the seller):** an organization and its staff. Staff log in.
- **Their side (the buyer):** the people and sales being tracked. They never log in.

```
OUR SIDE (customers of MiniCRM)            THEIR SIDE (what the sales team tracks)

organizations  1 ──── N  users             leads  1 ──── N  contacts
   (a company             (its staff,         (a prospect)     (other people around that prospect)
    using MiniCRM)         who log in)        leads  1 ──── N  deals
                                                     (a possible sale)
organizations 1 ──── N leads   (every lead, contact and deal belongs to exactly one organization)
users         1 ──── N leads   (leads.assigned_to: which staff member is responsible)
```

## The tables

| Table | What a row is | Belongs to | Who is it |
|---|---|---|---|
| organizations | A company that uses MiniCRM (a tenant) | nobody | our customer |
| users | An employee of that organization who logs in to MiniCRM | one organization | our side |
| leads | A prospect the organization is trying to sell to: one person, with the company they work for | one organization; optionally assigned to one user | their side |
| contacts | Another person connected to that lead (their boss, a colleague, an assistant) | one lead (and so one organization) | their side |
| deals | A specific possible sale tied to a lead, with a value and a stage | one lead (and so one organization) | their side |

## One example

Organization 1, "Alpha Sales", is a company that uses MiniCRM.

- **Users** (Alpha's staff): Alice, Karan. They log in.
- **Lead:** Rahul Sharma, who works at Infosys. Assigned to Alice.
  - **Contacts** of that lead: Priya Nair (Rahul's director, approves the budget), Amit Patel (IT manager, evaluates the product).
  - **Deal:** "Cloud migration project", 50,000, stage `negotiation`.

Organization 2 is a completely separate company using the same database. It cannot see anything of Alpha's. That separation is called multi-tenancy, and it is why almost every query has `WHERE organization_id = ...`.

## Rules to remember

1. Users are staff of the seller. Leads, contacts and deals are the people and sales being tracked. A user is never a lead or a contact.
2. Only users log in (from Day 22 onward). Leads and contacts are records, not accounts.
3. A lead is the main prospect record. A contact is an extra person attached to a lead. Several contacts can point to one lead (`contacts.lead_id`).
4. Every row stores its `organization_id`, and the composite foreign keys make sure a contact, deal or assignment can never cross into another organization.
5. `leads.assigned_to` points to a USER (our staff member), not a contact.

## A deliberate simplification

Real CRMs such as Zoho usually convert a lead into a contact plus a company plus a deal once it is qualified. MiniCRM does not do conversion. A lead stays a lead, and contacts are extra people attached to it. This keeps the project small enough to finish. It could be extended later, but it is not planned.
