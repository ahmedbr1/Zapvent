# Zapvent | Smart Campus Events & Vendor Management Platform

Zapvent unifies event planning, vendor coordination, ticketing, and student engagement for university event offices. The platform ships with dedicated portals for administrators, vendors, event-office coordinators, and general users so every workflow (approvals, payments, attendance tracking, feedback, and analytics) happens in one place.

> TODO: Replace this paragraph with your team-specific elevator pitch (why you chose this problem, which stakeholders you interviewed, and what success looks like for Sprint 2).

---

## Motivation

- Deliver a centralized workspace where Event Office staff can create bazaars, workshops, and courts without juggling spreadsheets or messaging apps.
- Provide students and vendors with transparent registration, payment, and feedback loops so participation feels safe and predictable.
- Capture real-time operational data (attendance, sales, polls, ratings) that can be surfaced to leadership through dashboards and exports.

> TODO: Add a short paragraph describing your personal motivation (e.g., campus pain points discovered during interviews, KPIs you set for Sprint 2).

---

## Build Status & Known Issues

| Check | Status | Notes |
| --- | --- | --- |
| `npm run dev` | ✅ Boots the Next.js app with mocked API routes. |
| `npm run build && npm start` | ⚠️ Requires `MONGODB_URI`, `JWT_SECRET`, and `STRIPE_SECRET_KEY` env vars before running. |
| `npm run lint` | ✅ Passes on Node 18.18+ (ESLint flat config). |
| `npm run test` | ⏳ Needs up-to-date Jest/Postman evidence (attach screenshot in the **Tests** section). |

### Known issues / technical debt
- Stripe webhook signature verification is mocked during local development; production keys must be configured before go-live.
- Email/SMS notifications are queued synchronously; large campaigns may block responses until a worker is introduced.
- Global search caching is not implemented yet, so filtering large event lists may hit the database on every request.
- > TODO: List every bug or limitation you are aware of for Sprint 2 (missing features, failing tests, unfinished UX polish, etc.).

---

## Screenshots / Demo Evidence

Provide **at least five** visuals (PNG/JPG/GIF/MP4). Keep them inside `public/docs/screenshots` or link to an accessible video.

1. `![Screenshot 01 - Auth Landing](public/docs/screenshots/01-auth-landing.png)`  
	 > TODO: Replace with your actual landing/login screenshot + one-sentence caption.
2. `![Screenshot 02 - Admin Dashboard](public/docs/screenshots/02-admin-dashboard.png)`  
	 > TODO: Show the metrics/cards that prove admin workflows.
3. `![Screenshot 03 - Vendor Application](public/docs/screenshots/03-vendor-application.png)`  
	 > TODO: Demonstrate vendor onboarding or bazaar signup.
4. `![Screenshot 04 - Event Payments](public/docs/screenshots/04-event-payments.png)`  
	 > TODO: Highlight Stripe wallet split payments or receipts.
5. `![Screenshot 05 - Reports & Exports](public/docs/screenshots/05-reports.png)`  
	 > TODO: Capture attendance/sales report or XLSX export confirmation.

If you prefer a video: `![Video Thumbnail](public/docs/screenshots/demo-thumb.png)` with a link `https://...`.

---

## Tech / Frameworks Used

- **Next.js 14 (App Router) + React 18** for the authenticated web client.
- **TypeScript** end-to-end for strict typing (frontend, server, and shared libs).
- **Material UI + notistack** for UI components, theming, and toast notifications.
- **Node.js + Express-style server** under `server/` for REST APIs, JWT auth, and business logic.
- **MongoDB + Mongoose** for persistence of users, events, payments, ratings, polls, and reports.
- **Stripe** for payments, wallet top-ups, and reconciliations.
- **Jest + mongodb-memory-server** for deterministic unit/integration tests.
- **Postman** collections for manual/automated API verification.

> TODO: Mention any additional services (Vercel, Render, AWS S3, SendGrid, etc.) that your deployment uses.

---

## Features (Sprint 2 Scope)

- Multi-role authentication and session handling (Admin, Event Office, Vendor, User, Student).
- Event lifecycle management: creation, vendor approvals, participant registration, cancellation dialog with refunds.
- Vendor workflows covering applications, booth assignments, and wallet balance tracking.
- Integrated wallet + card split payments with automated receipt emails.
- Feedback and survey modules (ratings, polls, workshop feedback explorer) for post-event insights.
- Reporting suite (attendance, sales, workshop metrics) with XLSX/CSV exports.
- Notifications menu for unread system alerts plus server health status checks.

> TODO: Add/remove bullets to reflect the exact Sprint 2 deliverables demonstrated to graders.

---

## Code Examples

1. **Filter persistence on the client** (`components/events/EventFiltersBar.tsx`)

	 ```tsx
	 const setFilter = <K extends keyof EventFilters>(key: K, filterValue: EventFilters[K]) => {
		 onChange({ ...value, [key]: filterValue });
	 };

	 const handleResetAll = () => {
		 onChange({
			 search: "",
			 eventType: "All",
			 location: "All",
			 sessionType: "All",
			 professor: "",
			 startDate: null,
			 endDate: null,
			 sortOrder: "asc",
		 });
	 };
	 ```

2. **Professor selection guard** (`server/services/eventService.ts`)

	 ```ts
	 async function validateProfessorSelection(input: unknown): Promise<ProfessorSelection> {
		 if (!Array.isArray(input) || input.length === 0) {
			 return { success: false, message: "At least one participating professor is required." };
		 }

		 const seen = new Set<string>();
		 const ids = input
			 .map((value) => (typeof value === "string" ? value.trim() : ""))
			 .filter((value) => {
				 if (!value) return false;
				 if (seen.has(value)) {
					 return false;
				 }
				 seen.add(value);
				 return true;
			 });

		 if (ids.length === 0) {
			 return { success: false, message: "At least one participating professor is required." };
		 }

		 if (ids.some((id) => !Types.ObjectId.isValid(id))) {
			 return { success: false, message: "Invalid professor identifier provided." };
		 }

		 const professors = await UserModel.find({ _id: { $in: ids }, role: userRole.PROFESSOR })
			 .select(["firstName", "lastName"])
			 .lean<Array<IUser & { _id: Types.ObjectId }>>();

		 if (professors.length !== ids.length) {
			 return { success: false, message: "All participating professors must be verified professor accounts." };
		 }

		 const nameMap = new Map<string, string>();
		 professors.forEach((professor) => {
			 nameMap.set(professor._id.toString(), buildProfessorName(professor));
		 });

		 const names = ids.map((id) => nameMap.get(id) ?? "Professor");

		 return { success: true, ids, names };
	 }
	 ```

3. **Wallet + card split payments** (`server/services/paymentService.ts`)

	 ```ts
	 export async function payByWallet(eventId: string, userId: string, payload: PayByWalletInput = {}): Promise<ServiceResponse<PayByWalletData>> {
		 try {
			 const resolved = await ensureEventAndUser(eventId, userId);
			 if (!resolved.success) {
				 return resolved;
			 }

			 const { event, user } = resolved;

			 if (!isRegistrationAllowed(event)) {
				 return {
					 success: false,
					 message: "Payments are only supported for workshops and trips.",
					 statusCode: 400,
				 };
			 }

			 const alreadyRegistered = userIsRegistered(event, userId);
			 if (!alreadyRegistered) {
				 const registrationResult = await registerUserForWorkshop(eventId, userId);
				 if (!registrationResult.success) {
					 return {
						 success: false,
						 message: registrationResult.message ?? "Unable to register for this event before processing payment.",
						 statusCode: registrationResult.statusCode ?? 400,
					 };
				 }
			 }

			 const priceRaw = typeof event.price === "number" && !Number.isNaN(event.price) ? event.price : 0;
			 const price = Math.max(priceRaw, 0);

			 const wantWallet = payload.useWalletBalance ?? (!payload.paymentSource || payload.paymentSource.toLowerCase() === "wallet");
			 const walletBalance = Math.max(user.balance ?? 0, 0);

			 const walletPortion = wantWallet && price > 0 ? Math.min(walletBalance, price) : 0;
			 const remaining = Math.max(price - walletPortion, 0);

			 const cardType = normalizeCardType(payload.paymentSource);

			 if (remaining > 0 && !cardType) {
				 return {
					 success: false,
					 message: "Insufficient wallet balance. Please specify credit or debit card payment.",
					 statusCode: 400,
				 };
			 }

			 const method: PaymentMethod =
				 price === 0 || (remaining === 0 && walletPortion > 0)
					 ? "Wallet"
					 : walletPortion > 0 && remaining > 0
					 ? "Mixed"
					 : cardType ?? "CreditCard";

			 // ...snip... persist payment, send receipt, and return balances
		 } catch (error) {
			 console.error("payByWallet error:", error);
			 return { success: false, message: "Failed to record payment.", statusCode: 500 };
		 }
	 }
	 ```

4. **JWT decoding on the client** (`lib/auth-jwt.ts`)

	 ```ts
	 export function decodeToken(token: string): SessionState | null {
		 try {
			 const [, payloadPart] = token.split(".");
			 if (!payloadPart) {
				 return null;
			 }

			 const payload = JSON.parse(base64UrlDecode(payloadPart)) as TokenPayload;

			 const user: SessionUser = {
				 id: payload.id,
				 email: payload.email,
				 role: payload.role,
				 userRole: payload.userRole,
				 adminType: payload.adminType,
				 name:
					 payload.firstName || payload.lastName
						 ? [payload.firstName, payload.lastName].filter(Boolean).join(" ")
						 : undefined,
				 companyName: payload.companyName,
				 status: payload.status,
				 logo: payload.logo,
			 };

			 return { token, user };
		 } catch {
			 return null;
		 }
	 }
	 ```

5. **Role-aware logout flow** (`components/layout/AppShell.tsx`)

	 ```tsx
	 const handleLogout = async () => {
		 handleMenuClose();
		 try {
			 await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
		 } finally {
			 clearSession();
			 enqueueSnackbar("You have been logged out.", { variant: "info" });
			 const role = session?.user.role ?? null;
			 if (role) {
				 router.replace(getLoginPathForRole(role));
			 } else {
				 router.replace("/login/user");
			 }
		 }
	 };
	 ```

---

## API References (minimum five routes)

| Method | Route | Description | Auth |
| --- | --- | --- | --- |
| GET | `/api/events` | List bazaars/workshops/trips with filters + pagination. | Public |
| POST | `/api/events` | Create a new event on behalf of Event Office. | Admin / Event Office |
| GET | `/api/events/:eventId/applications` | Fetch vendor applications for a specific bazaar. | Admin / Event Office |
| POST | `/api/events/:id/pay-by-wallet` | Register attendee and process wallet/mixed payment. | Authenticated User |
| PATCH | `/api/events/workshop/:id/approve` | Approve a proposed workshop submission. | Event Office |
| GET | `/api/events/:id/export-registrations` | Export attendees as XLSX for audits. | Event Office |

> TODO: Add login/logout routes, vendor CRUD, polls, notifications, etc., until you list all critical Sprint 2 endpoints.

---

## Tests

- Test runner: **Jest** with `mongodb-memory-server` for backend services, plus **Postman** regression suites for HTTP flows.
- Run everything locally: `npm run test`
- > TODO: Paste a screenshot (or link) of your Jest CLI output **and** your Postman collection results here.

| Test File / Collection | Focus | Notes |
| --- | --- | --- |
| `tests/server/services/adminService.test.ts` | Admin creation, impersonation guardrails. | Uses fixtures + memory Mongo. |
| `tests/server/services/courtService.test.ts` | Booking conflict detection + slot limits. | Validates overlapping reservations. |
| `tests/server/services/gymSessionService.test.ts` | Gym session CRUD, attendance caps. | Ensures waitlist logic works. |
| `tests/server/services/loginService.test.ts` | Credential validation + JWT issuance. | Stubs bcrypt + token signing. |
| `tests/server/services/notificationService.test.ts` | Notification fan-out when events publish. | Verifies unread counters per role. |
| Postman `Events Office` collection | End-to-end approvals + payments. | > TODO: attach screenshot + mention environment file used. |

---

## Contribute

1. Fork the repo, create a branch named `feature/<short-description>`.
2. Install dependencies (`npm install`) and run `npm run lint && npm run test` before pushing.
3. Open a pull request that includes: motivation, screenshots, testing evidence, and any environment setup notes.
4. For bug reports, include reproduction steps, expected vs. actual behavior, and attach screenshots/logs.

We especially welcome accessibility improvements, additional automated tests, and deployment hardening (Docker/Vercel configs).

---

## Credits

- Next.js, React, and Vercel documentation for routing, caching, and deployment guides.
- Material UI + notistack docs for theming and notification patterns.
- Stripe API docs for payment intents, wallet balance management, and webhook flows.
- MongoDB + Mongoose guides for schema design and aggregation pipelines.
- > TODO: Add every article, YouTube video, Stack Overflow thread, or template that helped you ship Sprint 2.

---

## License

- Application code is released under the [MIT License](LICENSE).
- Stripe SDK (Apache 2.0) and any other third-party packages retain their original licenses—see `package.json` for the complete list.
- > TODO: Reference any proprietary assets (icons, fonts, illustrations) and their licenses if they are bundled in this repo.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev

# Build production bundles
npm run build
npm start

# Lint & type-check
npm run lint
```

## Code Examples

1. **Front-end filtering helper** (`components/events/EventFiltersBar.tsx`)

```tsx
const setFilter = <K extends keyof EventFilters>(
	key: K,
	filterValue: EventFilters[K]
) => {
	onChange({ ...value, [key]: filterValue });
};

const handleResetAll = () => {
	onChange({
		search: "",
		eventType: "All",
		location: "All",
		sessionType: "All",
		professor: "",
		startDate: null,
		endDate: null,
		sortOrder: "asc",
	});
};
```

2. **Professor validation** (`server/services/eventService.ts`)

```ts
async function validateProfessorSelection(
	input: unknown
): Promise<ProfessorSelection> {
	if (!Array.isArray(input) || input.length === 0) {
		return {
			success: false,
			message: "At least one participating professor is required.",
		};
	}

	const seen = new Set<string>();
	const ids = input
		.map((value) => (typeof value === "string" ? value.trim() : ""))
		.filter((value) => {
			if (!value) return false;
			if (seen.has(value)) {
				return false;
			}
			seen.add(value);
			return true;
		});

	if (ids.length === 0) {
		return {
			success: false,
			message: "At least one participating professor is required.",
		};
	}

	if (ids.some((id) => !Types.ObjectId.isValid(id))) {
		return {
			success: false,
			message: "Invalid professor identifier provided.",
		};
	}

	const professors = await UserModel.find({
		_id: { $in: ids },
		role: userRole.PROFESSOR,
	})
		.select(["firstName", "lastName"])
		.lean<Array<IUser & { _id: Types.ObjectId }>>();

	if (professors.length !== ids.length) {
		return {
			success: false,
			message:
				"All participating professors must be verified professor accounts.",
		};
	}

	const nameMap = new Map<string, string>();
	professors.forEach((professor) => {
		nameMap.set(professor._id.toString(), buildProfessorName(professor));
	});

	const names = ids.map((id) => nameMap.get(id) ?? "Professor");

	return {
		success: true,
		ids,
		names,
	};
}
```

3. **Wallet + card split payments** (`server/services/paymentService.ts`)

```ts
export async function payByWallet(
	eventId: string,
	userId: string,
	payload: PayByWalletInput = {}
): Promise<ServiceResponse<PayByWalletData>> {
	try {
		const resolved = await ensureEventAndUser(eventId, userId);
		if (!resolved.success) {
			return resolved;
		}

		const { event, user } = resolved;

		if (!isRegistrationAllowed(event)) {
			return {
				success: false,
				message: "Payments are only supported for workshops and trips.",
				statusCode: 400,
			};
		}

		const alreadyRegistered = userIsRegistered(event, userId);
		if (!alreadyRegistered) {
			const registrationResult = await registerUserForWorkshop(eventId, userId);
			if (!registrationResult.success) {
				return {
					success: false,
					message:
						registrationResult.message ??
						"Unable to register for this event before processing payment.",
					statusCode: registrationResult.statusCode ?? 400,
				};
			}
		}

		const priceRaw =
			typeof event.price === "number" && !Number.isNaN(event.price)
				? event.price
				: 0;
		const price = Math.max(priceRaw, 0);

		const wantWallet =
			payload.useWalletBalance ??
			(!payload.paymentSource ||
				payload.paymentSource.toLowerCase() === "wallet");
		const walletBalance = Math.max(user.balance ?? 0, 0);

		const walletPortion =
			wantWallet && price > 0 ? Math.min(walletBalance, price) : 0;
		const remaining = Math.max(price - walletPortion, 0);

		const cardType = normalizeCardType(payload.paymentSource);

		if (remaining > 0 && !cardType) {
			return {
				success: false,
				message:
					"Insufficient wallet balance. Please specify credit or debit card payment.",
				statusCode: 400,
			};
		}

		const method: PaymentMethod =
			price === 0 || (remaining === 0 && walletPortion > 0)
				? "Wallet"
				: walletPortion > 0 && remaining > 0
					? "Mixed"
					: cardType ?? "CreditCard";

		// ...snip... full implementation computes receipt, saves UserPayment document, emails receipt, and returns balances
	} catch (error) {
		console.error("payByWallet error:", error);
		return {
			success: false,
			message: "Failed to record payment.",
			statusCode: 500,
		};
	}
}
```

4. **JWT decoding on the client** (`lib/auth-jwt.ts`)

```ts
export function decodeToken(token: string): SessionState | null {
	try {
		const [, payloadPart] = token.split(".");
		if (!payloadPart) {
			return null;
		}

		const payload = JSON.parse(base64UrlDecode(payloadPart)) as TokenPayload;

		const user: SessionUser = {
			id: payload.id,
			email: payload.email,
			role: payload.role,
			userRole: payload.userRole,
			adminType: payload.adminType,
			name:
				payload.firstName || payload.lastName
					? [payload.firstName, payload.lastName].filter(Boolean).join(" ")
					: undefined,
			companyName: payload.companyName,
			status: payload.status,
			logo: payload.logo,
		};

		return {
			token,
			user,
		};
	} catch {
		return null;
	}
}
```

5. **Role-aware logout flow** (`components/layout/AppShell.tsx`)

```tsx
const handleLogout = async () => {
	handleMenuClose();
	try {
		await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
	} finally {
		clearSession();
		enqueueSnackbar("You have been logged out.", { variant: "info" });
		const role = session?.user.role ?? null;
		if (role) {
			router.replace(getLoginPathForRole(role));
		} else {
			router.replace("/login/user");
		}
	}
};
```

## API References

| Method | Route | Description | Auth |
| --- | --- | --- | --- |
| GET | `/api/events` | List every event/bazaar/workshop (paginated client-side) | Public |
| POST | `/api/events` | Create a new bazaar (Event Office) | Admin/EventOffice token |
| GET | `/api/events/:eventId/applications` | Vendor applications for a bazaar | Admin/EventOffice |
| POST | `/api/events/:id/pay-by-wallet` | Register & pay via wallet/mixed payment | Authenticated Student/Staff/Professor/TA |
| PATCH | `/api/events/workshop/:id/approve` | Approve a proposed workshop | Event Office |
| GET | `/api/events/:id/export-registrations` | Export attendees as XLSX | Event Office |

Add any other routes (login, vendor CRUD, polls, etc.) if you need more than the minimum five references.

## Tests

- Test runner: `jest` with `mongodb-memory-server` for deterministic data.
- Run locally: `npm run test`
- Current suite highlights (add screenshots of Postman collections or Jest output here):

| Test file | What it verifies |
| --- | --- |
| `tests/server/services/adminService.test.ts` | Admin creation + role guard logic. |
| `tests/server/services/courtService.test.ts` | Booking conflict detection for courts. |
| `tests/server/services/gymSessionService.test.ts` | Gym session CRUD and attendance caps. |
| `tests/server/services/loginService.test.ts` | Credential validation + JWT issuance. |
| `tests/server/services/notificationService.test.ts` | Fan-out when events are published. |
| `tests/server/services/userService.test.ts` | Profile updates, blocking rules, wallet balance math. |

> TODO: Paste your Postman test screenshots or Jest CLI screenshot right here to satisfy the rubric.

## Contribute

1. Fork the repo and create a feature branch named `feature/<short-description>`.
2. Run `npm run lint` and `npm run test` before opening a PR.
3. Describe the motivation, screenshots, and testing evidence in the PR body. Bug reports should include reproduction steps and the affected role.

We welcome UX polish, accessibility fixes, more automated tests, and production-ready DevOps scripts.

## Credits

- Next.js, React, Vercel docs for routing and deployment guidance.
- Material UI & notistack documentation for theming and feedback patterns.
- Stripe API + docs for payment intents, receipts, and refund workflows.
- MongoDB + Mongoose community examples for modeling subdocuments.
- Any tutorial, YouTube video, or article you relied on should be listed here. <!-- TODO: add personal references -->

## License

- Application code is released under the [MIT License](LICENSE).
- Stripe SDK (Apache 2.0) and other dependencies retain their original licenses—review `package.json` if you redistribute binaries.

If you integrate additional licensed assets (fonts, illustrations), reference them here so graders understand compliance.
