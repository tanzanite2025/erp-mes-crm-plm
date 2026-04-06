export const errors = {
  forbidden: {
    title: '403',
    subtitle: 'Access Forbidden',
    description: 'You do not have permission to view this resource.',
    cachedSessionHint: 'If this came from a cached session, sign in again with another account.',
    goBack: 'Go Back',
    relogin: 'Sign In Again',
    backHome: 'Back to Home',
  },
  notFound: {
    title: '404',
    subtitle: 'Oops! Page Not Found!',
    description: "It seems like the page you're looking for does not exist or might have been removed.",
    goBack: 'Go Back',
    backHome: 'Back to Home',
  },
  general: {
    title: '500',
    subtitle: 'Something went wrong',
    description: 'The system detected an unknown exception. Please try again later or contact the administrator.',
    goBack: 'Go Back',
    backHome: 'Back to Home',
  },
  unauthorized: {
    title: '401',
    subtitle: 'Unauthorized',
    description: 'Please sign in to continue access.',
    backLogin: 'Go to Login',
  },
  maintenance: {
    title: 'Maintenance',
    subtitle: 'Under Construction',
    description: "We're currently performing system optimizations. Please check back later.",
  },
} as const
