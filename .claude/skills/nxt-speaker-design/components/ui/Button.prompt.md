One-line: the app button — `gold` (orange) for the single action per view, `primary` navy for secondary, `outline`/`ghost` for tertiary.

```jsx
<Button variant="gold" size="lg">Book a speaker</Button>
<Button variant="outline">View profile</Button>
<Button variant="ghost">See all →</Button>
<Button variant="gold" loading>Sending</Button>
```

Orange is actions-only: never use `gold` for a non-clickable element. Disabled `gold` becomes #FFD9C7 with #B53E00 text.
