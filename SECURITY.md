# Security Policy

## What this is

The Airline Diagnostic Toolkit is a static site. Every tool runs in the
visitor's browser, there is no application server, no database and no
account system, and nothing a visitor types is transmitted anywhere. The
attack surface is correspondingly small — but "small" is not "none", and
this file exists so that finding something does not have to mean guessing
who to tell.

## Reporting a vulnerability

Email **info@aviationhubkenya.org** with `SECURITY` in the subject line.

Please include what you found, the URL or file it affects, and enough
detail to reproduce it. A proof of concept is welcome and not required.

We will acknowledge within **five working days**. This is a small
practice, not a security team with a rota, and an honest turnaround
figure is more useful than an ambitious one nobody meets.

Please do not open a public issue for a vulnerability. Everything else —
a wrong figure, a stale citation, a broken link — is better in the open,
and very welcome there.

## What we are most interested in

In rough order of how much they would matter here:

- **Content-Security-Policy bypass.** The policy in `_headers` is load
  bearing: it is what enforces the claim that the site makes no external
  requests. A way around it undermines a promise made to visitors, not
  just a control.
- **Cross-site scripting**, particularly through a URL parameter. The
  shareable-result links and the `?partner=` white-label parameter both
  take input from a URL and put it on a page.
- **Anything that causes data to leave the visitor's device.** The
  privacy notice says nothing is transmitted. If that is not true
  somewhere, it is the most serious thing you could tell us.
- **Local storage handling** that could expose one visitor's saved work
  to another on a shared machine.
- **Dependency or supply-chain issues** in the build and test toolchain.

## What is out of scope

- Missing security headers that do not lead to an exploitable condition.
  We are happy to hear about them; they are hardening, not
  vulnerabilities.
- Automated scanner output with no demonstrated impact.
- Social engineering, physical access, or attacks on our email provider,
  DNS registrar or hosting provider — report those to the provider.
- Denial of service against a static site behind a CDN.

## Safe harbour

If you are acting in good faith to find and report a vulnerability, we
will not pursue or support any action against you. Please avoid
degrading the service for others, and do not access, modify or retain
anyone else's data — including anything in another person's browser
storage.

## Recognition

We have no bounty programme. We will credit you by name in the fix
commit if you would like us to, and we will not name you if you would
rather we did not.
