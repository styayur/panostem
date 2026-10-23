# Security Policy

## Supported versions

Security fixes target the latest release and current `main`.

## Report privately

Do not report exploitable issues in a public issue. Use GitHub private vulnerability reporting:

https://github.com/styayur/panostem/security/advisories/new

Include the affected surface/version, source URL or query, Windows/browser environment, reproduction, impact, and minimal proof-of-concept details. Remove browsing history, cookies, local paths, and personal data.

## Scope

Desktop ManimGL scenes intentionally execute arbitrary local Python after explicit
trust for a project revision. They have the current user's file/network/system
permissions. A virtual environment, AST inspection and process Job Object/group
are not a security sandbox. Never run unknown projects using ordinary local Run
buttons; use disposable OS isolation. Experimental Windows Sandbox export is
separate and its GPU execution is not verified on the local test host.

Opening/importing a project or share must never execute Python. Installing runtime
and project packages requires separate consent. Vulnerabilities include missing
authorization, secret-environment inheritance, process leaks, unsafe ZIP extraction,
cross-window media/IPC disclosure and unbounded parser/log handling. Python code
performing operations expressly authorized by its local trust grant is not by
itself proof of an application sandbox escape; no local-run sandbox is claimed.

Relevant issues include URL-scheme validation, path or IPC escapes from WebViewer windows, unsafe injection into embedded pages, proxy/header bypasses, dependency compromise, index poisoning, and translation data leakage.

Panostem does not bypass CSP, X-Frame-Options, authentication, CAPTCHAs, or anti-bot controls. It is a resource discovery/comparison tool, not a general-purpose browser.
