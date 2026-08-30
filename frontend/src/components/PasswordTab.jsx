import { useState } from 'react'
import client from '../api/client'
import { useToast } from '../context/ToastContext'
import { Alert, Button, Input } from './ui'
import { EyeIcon, EyeOffIcon } from './icons'

function PasswordField({ label, value, onChange, error, autoComplete }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        error={error}
        autoComplete={autoComplete}
        className="pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-[34px] right-2.5 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

export default function PasswordTab() {
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const next = {}
    if (!currentPassword) next.current_password = 'Your current password is required.'
    if (!password) next.password = 'A new password is required.'
    else if (password.length < 8) next.password = 'Your new password must be at least 8 characters.'
    if (password && confirmation && password !== confirmation) next.password_confirmation = "Passwords don't match."
    if (!confirmation) next.password_confirmation = 'Please retype your new password to confirm it.'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await client.post('/password/change', {
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      })
      toast.success('Password updated successfully', {
        description: 'Your password has been changed successfully.',
      })
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
      setErrors({})
    } catch (err) {
      const messages = err.response?.data?.errors
      const message = messages ? Object.values(messages).flat().join(' ') : null
      setFormError(message || 'We couldn’t update your password. Please check your current password and try again.')
      toast.error('Password update failed', {
        description: message || 'We couldn’t update your password. Please check your current password and try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="max-w-md space-y-5" onSubmit={handleSubmit}>
      {formError && <Alert>{formError}</Alert>}

      <PasswordField
        label="Old Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        error={errors.current_password}
        autoComplete="current-password"
      />
      <PasswordField
        label="New Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        autoComplete="new-password"
      />
      <p className="-mt-3 text-xs text-muted-foreground">Must be at least 8 characters.</p>
      <PasswordField
        label="Retype New Password"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        error={errors.password_confirmation}
        autoComplete="new-password"
      />

      <Button type="submit" disabled={submitting} loading={submitting} className="w-full sm:w-auto">
        {submitting ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  )
}
