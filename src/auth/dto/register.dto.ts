export interface RegisterDto {
  username: string;
  gender: string;
  country: string;
  phone: string;
  password: string;
  [key: string]: any;  
}