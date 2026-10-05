One-line: the app modal — used for the speaker profile sheet, booking form and admin add-speaker flow.

```jsx
<Modal open={open} onClose={close} title="Request a booking" maxWidth="2xl">
  <div style={{padding:'var(--space-6)'}}>…</div>
</Modal>
```

Body scroll locks while open; Escape closes; clicking the scrim closes.
