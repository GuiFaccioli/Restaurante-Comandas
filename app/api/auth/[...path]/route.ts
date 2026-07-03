const disabledAuthResponse = () =>
  Response.json(
    {
      error: 'First-party auth uses Server Actions in /auth/sign-in and /auth/sign-up.',
    },
    { status: 404 }
  )

export const GET = disabledAuthResponse
export const POST = disabledAuthResponse
