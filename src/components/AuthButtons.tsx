import { signIn, signOut } from "@/auth"

export function SignIn() {
    return (
        <form
            action={async () => {
                "use server"
                await signIn("google")
            }}
        >
            <button
                type="submit"
                className="btn btn-sm sm:btn-md bg-sage-600 text-white hover:bg-sage-700 border-none shadow-sm whitespace-nowrap"
            >
                ログイン
            </button>
        </form>
    )
}

export function SignOut() {
    return (
        <form
            action={async () => {
                "use server"
                await signOut()
            }}
        >
            <button
                type="submit"
                className="btn btn-sm bg-sage-100 text-sage-700 hover:bg-sage-200 border-none shadow-sm whitespace-nowrap px-3"
            >
                ログアウト
            </button>
        </form>
    )
}
