export class AuthService {
    constructor(private readonly database: unknown) { }

    public async login(user: string): Promise<boolean> {
        // eslint-disable-next-line no-console -- Disabling because this is a demo/skeleton file.
        console.log("Logging in", user);
        return true;
    }

    public logout(): void {
        // eslint-disable-next-line no-console -- Disabling because this is a demo/skeleton file.
        console.log("Logging out");
    }
}

export function validateToken(token: string): boolean {
    return token.length > 10;
}
