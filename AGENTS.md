# Architecture rules

- Resolve special installment agreements through `getNextInstallmentAmount` in the business domain, keyed by the dedicated offer ID, so payment actions and notifications use the same amount without relying on a customer's email.