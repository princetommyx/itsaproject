export default function AuthField({ label, ...props }) {
  return (
    <label className="block text-left">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="-mx-2 w-full rounded-md border-0 border-b-2 border-slate-300 bg-transparent px-2 py-2.5 text-[17px] font-medium text-slate-900 transition duration-150 placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-upsa-blue focus:bg-blue-50/60 focus:outline-none"
        {...props}
      />
    </label>
  )
}
