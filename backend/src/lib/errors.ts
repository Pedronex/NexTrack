export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export function toErrorResponse(error: unknown): {
	status: number;
	body: { error: string; code: string };
} {
	if (error instanceof ApiError) {
		return { status: error.status, body: { error: error.message, code: error.code } };
	}
	console.error("[worker]", error instanceof Error ? error.name : typeof error);
	return {
		status: 500,
		body: { error: "Erro interno", code: "internal_error" },
	};
}
