const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  ai_configured: boolean;
}

export async function checkBackendHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_URL}/health`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  return (await response.json()) as HealthStatus;
}
