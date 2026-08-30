export default function AuthField({ label, ...props }) {
  return (
    <label className="block text-left">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      <input
        className="-mx-2 w-full rounded-md border-0 border-b-2 border-border bg-transparent px-2 py-2.5 text-[17px] font-medium text-foreground transition duration-150 placeholder:font-normal placeholder:text-muted-foreground hover:border-ring/60 focus:border-brand focus:bg-blue-50/60 focus:outline-none"
        {...props}
      />
    </label>
  )
}
