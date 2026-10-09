import type {Lead} from "../models/lead.js";

export let leads: Lead[] = [
  {
    id: 1,
    name: "Sophie Keller",
    email: "sophie@example.ch",
    phone: "+41791234567",
    company: "Alpine Solutions",
    status: "new",
  },
  {
    id: 2,
    name: "Haruto Sato",
    email: "haruto@example.jp",
    company: "Sakura Technologies",
    status: "contacted",
  },
  {
    id: 3,
    name: "Valentina Cruz",
    email: "valentina@example.mx",
    phone: "+525512345678",
    company: "Sol Digital",
    status: "qualified",
  },
  {
    id: 4,
    name: "Oliver Bennett",
    email: "oliver@example.au",
    phone: "+61412345678",
    company: "Southern Cross Systems",
    status: "new",
  },
  {
    id: 5,
    name: "Aarav Mehta",
    email: "aarav@example.in",
    company: "Nimbus Innovations",
    status: "contacted",
  },
];