One-line: the navy portal sidebar for the client, speaker and admin apps.

```jsx
<Sidebar role="CLIENT" userName="Lerato Dube" active="/client/discover" onNavigate={go} assetBase="../../assets" />
```

The active row is the only place a 2px orange left border appears. Nav items per role are fixed (`clientNav`, `speakerNav`, `adminNav`).
