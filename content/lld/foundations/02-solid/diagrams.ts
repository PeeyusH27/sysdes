import type { ClassSpec } from "@/components/diagram/types";

export const mailerInversion: ClassSpec = {
  id: "mailer-inversion",
  title: "Dependency inversion, in four stages",
  description:
    "OrderService first builds its own SmtpMailer. Then it names what it needs as a Mailer interface, SmtpMailer implements that interface, and a FakeMailer implements it for tests. Every arrow ends at the interface.",
  classes: [
    { id: "service", name: "OrderService", col: 0, row: 1, fields: ["mailer: Mailer"], methods: ["place(order)"] },
    { id: "mailer", name: "Mailer", col: 1, row: 1, stereotype: "interface", methods: ["send(to, text)"] },
    { id: "smtp", name: "SmtpMailer", col: 2, row: 0, fields: ["host, port"], methods: ["send(to, text)"] },
    { id: "fake", name: "FakeMailer", col: 2, row: 2, fields: ["sent: list"], methods: ["send(to, text)"] },
  ],
  relations: [
    { from: "service", to: "mailer", type: "association", label: "uses" },
    { from: "smtp", to: "mailer", type: "implements" },
    { from: "fake", to: "mailer", type: "implements" },
  ],
  stages: [
    {
      title: "The policy builds its detail",
      note: "OrderService creates an SmtpMailer inside place(). The business rule points straight at a network detail, so every test needs a mail server and a new channel means editing the service.",
      add: ["service"],
    },
    {
      title: "Name the need",
      note: "Declare what the service needs, not who supplies it: a Mailer with send(to, text). The interface is owned by the service side, and the service talks only to it.",
      add: ["mailer"],
    },
    {
      title: "The detail plugs in",
      note: "SmtpMailer implements Mailer. The source-code arrow now points from the detail to the abstraction, which is the inversion: the detail depends on what the policy asked for.",
      add: ["smtp"],
    },
    {
      title: "A fake for the test",
      note: "FakeMailer records what was sent. A test builds the service with it, so there is no server and no network, and simulating a failure takes one line.",
      add: ["fake"],
    },
  ],
};
