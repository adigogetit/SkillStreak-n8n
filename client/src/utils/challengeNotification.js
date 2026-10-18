export function getCreateNowFeedback(result) {
  const warning = result?.notification?.warning || ''
  return {
    message: 'Your personalized challenge was created and saved.',
    warning,
  }
}
