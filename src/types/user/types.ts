export interface ILogin {
    email: string,
    password: string
}

export type TUserTypes = "SUPER_ADMIN" |
    "ADMIN" |
    "AUDITOR" |
    "FINANCE_MANAGER" |
    "MARKETING_MANAGER" |
    "MODERATOR" |
    "DEVELOPER" |
    "SELLER_SUPPORT" |

    "SELLER" |
    "SELLER_EMPLOYEE" |
    "SELLER_MARKETING_MANAGER" |
    "SELLER_FINANCE_MANAGER" |
    "CUSTOMER" |
    "COURIER"

export interface IUserPayload {
    userId: string;
    phoneNumber: string;
    roles: TUserTypes[];
    nameSurname: string;
    email: string;
    sub: string;
    iat: number; // issued at (timestamp)
    exp: number; // expires at (timestamp)
    sellerId: string;
    avatar?: string;
    friends?: IUserPayload[];
};