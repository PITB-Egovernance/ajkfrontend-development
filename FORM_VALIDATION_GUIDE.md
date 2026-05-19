# Form Validation — Migration Guide

Real-time, jQuery-style validation for every form in the admin frontend.
**Existing forms keep working as-is.** Migrate them one at a time using
this guide.

---

## What's available

| File | Purpose |
|---|---|
| `src/hooks/useFormValidation.js` | Hook: manages form state + errors, runs rules on change & blur |
| `src/components/ui/ValidatedTextField.jsx` | MUI TextField wrapper that auto-wires `value`/`onChange`/`onBlur`/`error`/`helperText` |
| `src/schemas/*.js` | Existing rule schemas (already used by some forms) |

---

## 30-second example

```jsx
import useFormValidation from 'hooks/useFormValidation';
import ValidatedTextField from 'components/ui/ValidatedTextField';

const rules = {
  name:  [{ type: 'required', message: 'Name is required' }],
  email: [
    { type: 'required', message: 'Email is required' },
    { type: 'email',    message: 'Invalid email format' },
  ],
  cnic:  [{ type: 'cnic', message: 'CNIC must be 13 digits' }],
  age:   [
    { type: 'min', value: 18, message: 'Must be at least 18' },
    { type: 'max', value: 60, message: 'Cannot exceed 60' },
  ],
};

const MyForm = () => {
  const form = useFormValidation(
    { name: '', email: '', cnic: '', age: '' },
    rules,
    { validateOnChange: true, validateOnBlur: true }   // jQuery-style
  );

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.validateAll()) return;            // shows all errors
    submit(form.values);
  };

  return (
    <form onSubmit={onSubmit}>
      <ValidatedTextField form={form} name="name"  label="Full Name *" />
      <ValidatedTextField form={form} name="email" label="Email *" />
      <ValidatedTextField form={form} name="cnic"  label="CNIC"  helperText="13 digits, no dashes" />
      <ValidatedTextField form={form} name="age"   label="Age" type="number" />
      <button type="submit" disabled={form.hasErrors}>Save</button>
    </form>
  );
};
```

That's it. Each field shows an error inline the moment the user types
something invalid; the error clears the moment it becomes valid; submit
is blocked until every field passes.

---

## Built-in rule types

Defined in `useFormValidation.js`. Each rule entry is `{ type, value?, message }`.

| `type` | Extra `value` | What it checks |
|---|---|---|
| `required` | — | Non-empty string, non-empty array, defined value |
| `email` | — | `name@host.tld` pattern |
| `minLength` | number | String length ≥ value |
| `maxLength` | number | String length ≤ value |
| `min` | number | Numeric value ≥ value |
| `max` | number | Numeric value ≤ value |
| `pattern` | RegExp | Matches the regex |
| `cnic` | — | 13 digits (dashes stripped) |
| `match` | string (other field name) | Equal to another field's value (for "confirm password") |

Need a custom rule? Pass `{ type: 'custom', validator: (v, allValues) => true|false, message: '…' }` — add this case to the `switch` in `validateField` and it'll work everywhere.

---

## BEFORE / AFTER patterns

### Pattern 1 — Simple required text field

**Before** (manual state, no live errors):

```jsx
const [name, setName] = useState('');
<TextField label="Name *" value={name} onChange={(e) => setName(e.target.value)} />
// errors only checked on submit via if (!name) alert('Name required');
```

**After** (live errors as user types):

```jsx
const form = useFormValidation({ name: '' }, { name: [{ type: 'required', message: 'Required' }] });
<ValidatedTextField form={form} name="name" label="Name *" />
```

### Pattern 2 — Number with range

**Before:**

```jsx
<TextField type="number" value={age} onChange={(e) => setAge(e.target.value)}
  inputProps={{ min: 18, max: 60 }} />
// User can still type 999 and submit — inputProps is just a browser hint
```

**After:**

```jsx
const form = useFormValidation(
  { age: '' },
  { age: [
      { type: 'required', message: 'Age is required' },
      { type: 'min', value: 18, message: 'Must be at least 18' },
      { type: 'max', value: 60, message: 'Cannot exceed 60' },
    ]}
);
<ValidatedTextField form={form} name="age" label="Age *" type="number" />
```

### Pattern 3 — Cross-field rule (min < max)

```jsx
// Need to combine the rule engine with a manual check, because the built-in
// rules look at a single field. Keep min/max field-level rules, then add a
// cross-field check before submitting:

const onSubmit = (e) => {
  e.preventDefault();
  if (!form.validateAll()) return;
  if (Number(form.values.min) >= Number(form.values.max)) {
    form.setError('min', 'Must be less than max');
    return;
  }
  submit(form.values);
};
```

(The existing Step3Eligibility.jsx — Min/Max age — uses this pattern manually.)

### Pattern 4 — Select dropdown

`ValidatedTextField` supports `select` exactly like MUI TextField:

```jsx
<ValidatedTextField form={form} name="status" select label="Status *">
  <MenuItem value="">Select</MenuItem>
  <MenuItem value="active">Active</MenuItem>
  <MenuItem value="inactive">Inactive</MenuItem>
</ValidatedTextField>
```

### Pattern 5 — Server-side errors

Laravel returns 422 with `{ errors: { email: ['Already taken'] } }`:

```jsx
try {
  await api.create(form.values);
} catch (err) {
  if (err.status === 422 && err.errors) {
    // Flatten Laravel arrays → single message per field
    const flat = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
    );
    form.setErrors(flat);   // Shows server errors inline on the fields
  }
}
```

---

## Hook options

```js
useFormValidation(initialValues, rules, {
  validateOnChange:    true,   // default — re-run validation each keystroke
  validateOnBlur:      true,   // default — re-run validation on focus loss
  liveErrorsUntouched: false,  // default — error only appears after first interaction
                               // set true if you want errors shown immediately (e.g. for
                               // pre-populated edit forms that already have invalid data)
});
```

---

## API quick reference

```js
const form = useFormValidation(initial, rules, options);

form.values            // current values object
form.errors            // { fieldName: 'message' | null }
form.touched           // { fieldName: true }
form.hasErrors         // boolean
form.isDirty           // boolean (changed from initialValues)

form.handleChange(e)   // wire to onChange
form.handleBlur(e)     // wire to onBlur
form.setValue(name, v)
form.setValues({...})  // merge multiple
form.setError(name, msg)
form.setErrors({...})  // merge multiple (use for 422 responses)
form.clearError(name)
form.clearAllErrors()
form.validateField(name, value)   // returns error string | null
form.validateAll()                 // returns boolean — call before submit
form.reset(newValues?)             // back to initial (or new values)

form.getFieldProps(name)           // raw shape: { value, onChange, onBlur, error: string|undef }
form.getMuiFieldProps(name, fallbackHelperText?)
                                   // MUI shape: { value, onChange, onBlur, error: bool, helperText: string }
```

---

## Migration priority (suggested order)

Forms ranked by user impact — migrate top to bottom:

1. **Login / Auth** — `src/pages/auth/Login.jsx`
2. **Requisition wizard** — `src/pages/requisition/Steps/Step1JobDetails.jsx`, `Step2Criteria.jsx`, `Step3Eligibility.jsx` *(Step 3 already has manual live validation — convert it to the hook for consistency)*
3. **Applications status flows** — bulk/single status modals
4. **Settings management pages** — Districts, Designations, Grades, Companies, Exam Centers, Exam Halls (each is a small modal — quick wins)
5. **Roll number generator / editor** — already has some live checks (exam center, date, time); convert to hook
6. **Dispatch + Annex** — typically the smallest forms

For each form, the migration is roughly:

1. Replace `const [field, setField] = useState('')` lines with a single `useFormValidation` call
2. Replace `<TextField value={field} onChange={(e) => setField(e.target.value)} />` with `<ValidatedTextField form={form} name="field" />`
3. Replace manual submit-time `if (!field) alert(...)` with `if (!form.validateAll()) return;`
4. Forward any custom cross-field rules into the submit handler (Pattern 3)

A modest 5-10 minute job per form.

---

## What this does NOT replace

- **File upload validation** (size, MIME) — keep these as discrete checks; the rule engine is value-only.
- **DataGrid filter inputs** — these are user search criteria, not user input that needs validation.
- **Async / server-side checks** (e.g. "username already taken" while typing) — use `setError` after the fetch resolves; the engine doesn't run async rules out of the box.

---

*Built May 2026. Update this guide whenever new rule types are added to `useFormValidation.js`.*
