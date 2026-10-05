One-line: the form controls — label in Space Mono uppercase, 4px radius, teal border going orange on focus.

```jsx
<Input label="Event date" type="date" hint="We hold the date for 48 hours" />
<Input placeholder="Search speakers by name or topic..." iconLeft={<Icon name="search" size={16} />} />
<Textarea label="Brief" rows={4} />
<Select label="Sort" options={[{value:'rating_desc',label:'Top Rated'},{value:'fee_asc',label:'Fee: Low to High'}]} />
```
