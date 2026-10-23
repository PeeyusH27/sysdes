import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "Which cookie attribute stops JavaScript on the page from reading the cookie?",
    options: ["HttpOnly", "Secure", "SameSite"],
    answer: 0,
    explain: "HttpOnly hides the cookie from document.cookie, so an XSS bug cannot steal the session ID. Secure limits it to HTTPS, and SameSite limits cross-site sending.",
  },
  {
    q: "What does SameSite=Lax mainly defend against?",
    options: ["XSS", "CSRF: another site making your browser send an authenticated request", "Packet sniffing"],
    answer: 1,
    explain: "Lax withholds the cookie on most cross-site requests, so a malicious page cannot trigger a state-changing request as you. It does nothing against XSS.",
  },
  {
    q: "What is the main drawback of a stateless JWT compared with a server-side session?",
    options: ["It cannot carry a user ID", "It cannot be signed", "It is hard to revoke before it expires"],
    answer: 2,
    explain: "No server state means no switch to flip. Use short lifetimes with refresh tokens, or keep a deny-list, which brings state back.",
  },
  {
    q: "A JWT payload contains the user's email. Who can read it?",
    options: ["Only the server", "Anyone who holds the token, because it is signed but not encrypted", "Only the browser"],
    answer: 1,
    explain: "The payload is base64url-encoded JSON. The signature stops changes, not reading. Keep secrets out of it, or use an encrypted token.",
  },
  {
    q: "A page at app.example.com does a fetch PUT with a JSON body to api.example.com. What happens first?",
    options: ["The PUT is sent immediately", "The browser sends an OPTIONS preflight and waits for permission", "The server sends a cookie"],
    answer: 1,
    explain: "A PUT with a JSON content type is not a simple request, so the browser asks first. The preflight answer is cached for Max-Age seconds.",
  },
  {
    q: "A malicious script runs on a server and calls your API directly. Does CORS stop it?",
    options: ["Yes, CORS blocks all cross-origin calls", "No, CORS is enforced only by browsers, so the API still needs authentication", "Only if the API uses HTTP/2"],
    answer: 1,
    explain: "CORS protects a user's browser from other sites' scripts. A server or curl ignores it entirely, so authentication and authorization must stand on their own.",
  },
  {
    q: "You must send /api to one pool and /static to another. Which load balancer can do it?",
    options: ["An L4 balancer, because it is faster", "Neither, it needs DNS", "An L7 balancer, because it reads the HTTP path"],
    answer: 2,
    explain: "L4 sees only addresses and ports. Routing by path, host or header needs the balancer to terminate the connection and parse HTTP, which is L7.",
  },
];
