import api from "./Api";
import Cookies from "js-cookie";

export async function getLowStocks() {
    try {
        const res = await api.get("/api/reports/low-stock", {
            headers: {
                Authorization: `Bearer ${Cookies.get("sr_token")}`,
            },
        });

        console.log(res)
        return res.data;
    } catch (err) {
        console.error("getLowStocks error:", err);
        return { content: [], totalElements: 0, totalPages: 0 };
    }
}