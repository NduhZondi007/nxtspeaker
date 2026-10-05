One-line: the speaker discovery card — the most important component in the product.

```jsx
<SpeakerCard name="Thabo Mokoena" title="Rebuilding trust after a public failure"
  category="Leadership" fee="R85 000" location="Johannesburg" onBook={openBooking} />
```

Fees are formatted ZAR (`formatZAR`), displayed in Space Mono teal with a "per event" caption. Fall back to the navy initial when there is no photo — never a stock placeholder.
