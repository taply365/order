import dotenv from "dotenv";
dotenv.config();

const env = process.env.ENV;

const localOptions = {
    httpOnly: true,
    secure: false, // must be false on local http
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const prodOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: ".tryonapp.tech",
};

export default function setCookie(res, value) {
    const options = env === "local" ? localOptions : prodOptions;
    res.cookie("refresh_token", value, options);
}