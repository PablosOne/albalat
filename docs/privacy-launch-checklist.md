# Privacy and EU/Spain launch checklist

The website code blocks optional analytics and external media until consent,
renews consent after no more than 24 months, and exposes withdrawal controls.
The following controller/account tasks cannot be enforced by the static site and
must be completed before describing the service as fully compliant.

## Processors and international transfers

- Execute and retain the current data-processing terms/DPA for Web3Forms,
  Google Analytics, Cloudflare, and the hosting provider.
- Record each provider's legal entity, role, processing location, and transfer
  safeguard. For transfers outside the EEA, retain evidence of the applicable
  adequacy decision, EU-US Data Privacy Framework participation, or Standard
  Contractual Clauses and transfer-impact assessment.
- Recheck those safeguards and provider subprocessor lists at least annually.

## Account configuration

- In Google Analytics, set the shortest event-data retention that meets the
  actual measurement need (recommended: 2 months), disable Google Signals,
  advertising personalisation, unnecessary data sharing, and links to ad
  products unless the public disclosures and consent categories are expanded.
- Confirm the production Cloudflare Web Analytics configuration remains the
  standard cookieless beacon.
- Configure Web3Forms and the receiving mailbox so inquiries that do not become
  an ongoing relationship are deleted within 12 months of the last exchange.
- Run a production cookie/network scan before launch and after every provider
  or tag change; reconcile the result with the cookie-policy tables.

## Controller procedures

- Maintain a record of processing activities covering inquiries, analytics,
  hosting logs, and external media.
- Keep a written legitimate-interest assessment for answering general
  inquiries, plus procedures for access/deletion/objection requests, identity
  verification, processor deletion, data breaches, and the 30-day response
  deadline.
- Keep evidence that consent wording, category choices, policy version, and the
  deployed implementation were in use. The browser timestamp alone is useful
  for the visitor's device but is not the controller's complete accountability
  record.
- Apply the published 12-month inquiry schedule and document any statutory
  retention that applies when an inquiry becomes a contract or accounting
  record.

## Spanish legal notice (LSSI)

Because the site promotes professional services, obtain legal review on whether
an `Aviso legal` is required. If it is, publish it before launch with the
controller's full legal name, NIF/NIE, service address, contact details, and any
professional-registration details that apply. Do not publish placeholders or
invent these identifiers.

## Review

- Have Spanish/EU counsel verify the final public wording and the controller's
  actual practices. GDPR compliance is an ongoing operational obligation, not a
  one-time property of the banner.
