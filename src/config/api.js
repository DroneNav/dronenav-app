export const API_BASE_URL =
    import.meta.env.DEV
        ? 'https://api.dronenav.org/api'
        : '/api-gateway';