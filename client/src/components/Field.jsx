export default function Field({ label, error, ...props }) {
  return <div><label className="label" htmlFor={props.id}>{label}</label><input className={`input ${error ? 'border-red-400' : ''}`} {...props} />{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>
}
