# NLR EVSE Dashboard

Real-time EV charger availability for the National Laboratory of the Rockies:

## Run

Run the Angular interface at `http://localhost:4200`:

```shell
pnpm install
pnpm start
```

## Functionality

The Angular 22/Tailwind 4 interface:

- Queries EVSE data every 60 seconds and shows availability for garage levels 1–4.
- Summarizes available, in-use, and offline chargers; an online `Ready` charger is available.
- Shows accessible charging, loading/error states, and the relative last-update time.
- Provides a responsive, production service-worker-enabled interface.

## Development

```shell
pnpm format
pnpm lint
pnpm test
pnpm build
```

## Add to the iOS Home Screen

1. Open the dashboard in Safari and tap **Share**.

   <img src="images/1-safari.webp" alt="Share the dashboard from Safari" width="240">

2. Tap **Add to Home Screen**.

   <img src="images/2-add-to-home.webp" alt="Select Add to Home Screen" width="240">

3. Leave **Open as Web App** enabled and tap **Add**.

   <img src="images/3-config.webp" alt="Confirm the web app name and add it" width="240">

4. Open **NLR EVSE** from the Home Screen.

   <img src="images/4-home.webp" alt="NLR EVSE on the iOS Home Screen" width="240">

   <img src="images/5-app.webp" alt="NLR EVSE running as an iOS web app" width="240">
