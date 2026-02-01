export class User {
    public id: string = "";
    public name: string = "";
    public email: string = "";

    public static fromJson(json: string): User {
        const u = new User();
        // logic here
        return u;
    }
}

export class Order {
    public items: string[] = [];
    public total: number = 0;
}
