export const API_CONFIG = {
  USE_SAMPLE_DATA: false,
  CONCERT_RESEARCH_ENDPOINT: process.env.NODE_ENV === 'production'
    ? 'https://llm-backend.dissoannt.info/tasks/concert-research'
    : 'http://localhost:8000/tasks/concert-research'
};
