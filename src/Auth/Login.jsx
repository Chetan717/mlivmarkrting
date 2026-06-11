"use client";
import { useState } from "react";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import logo from "../../public/mlmboo2.ico";
import { InputOTP } from "@heroui/react";
import { useNavigate } from "react-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../Firebase";
import { toast } from "@heroui/react";
export function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [pin, setPin] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value.toString().trim();
    });

    // ── Validation ──────────────────────────────────────────────
    if (!/^[0-9]{10}$/.test(data.mobile)) {
      setFormError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!/^[0-9]{4}$/.test(pin)) {
      setFormError("Please enter a valid 4-digit PIN");
      return;
    }

    try {
      setLoading(true);
      setFormError("");

      // ── Find user by mobile ─────────────────────────────────
      const q = query(
        collection(db, "users"),
        where("mobileNo", "==", data.mobile),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setFormError("No account found with this mobile number");
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // ── Check if verified ───────────────────────────────────
      if (!userData.isverified) {
        setFormError("Account not verified. Please signup again.");
        return;
      }

      // ── Check PIN ───────────────────────────────────────────
      if (userData.password !== pin) {
        setFormError("Incorrect PIN. Please try again.");
        return;
      }

      // ── Save to localStorage ────────────────────────────────
      const userToStore = {
        id: userDoc.id,
        name: userData.name,
        mobileNo: userData.mobileNo,
        isverified: userData.isverified,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() ?? "",
      };

      localStorage.setItem("usermlm", JSON.stringify(userToStore));
      toast.success("User Login Successfully!");

      // ── Navigate to home ────────────────────────────────────
      navigate("/");
    } catch (error) {
      console.error("Login Error:", error);
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 justify-center w-full items-center h-screen">
      
      <img src={logo} className="w-[120px] h-[120px] " />

      <Form className="flex w-[290px] flex-col gap-4" onSubmit={onSubmit}>
        {/* Mobile */}
        <TextField name="mobile" type="tel">
          <Label className="font-bold text-[#5865f2]">Mobile No.</Label>
          <Input
            className="size-12 border-2 border-gray-200 w-[290px]"
            maxLength={10}
          />
          <FieldError />
        </TextField>

        {/* PIN */}
        <div className="flex flex-col gap-2">
          <Label className="font-bold text-[#5865f2]">Enter Pin</Label>
          <InputOTP
            name="pin"
            maxLength={4}
            value={pin}
            onChange={(val) => setPin(val)}
          >
            <InputOTP.Group className="gap-6">
              {[0, 1, 2, 3].map((i) => (
                <InputOTP.Slot
                  key={i}
                  index={i}
                  className="size-12 border-2 border-gray-200"
                />
              ))}
            </InputOTP.Group>
          </InputOTP>
        </div>

        {/* Error */}
        {formError && (
          <p className="text-red-500 text-sm text-center">{formError}</p>
        )}

        {/* Submit */}
        <Button className="w-[290px] size-12" type="submit" isLoading={loading}>
          {loading ? "Logging in..." : "Login Now"}
        </Button>

        {/* Register */}
        {/* <p className="text-center font-bold text-gray-700">
          Don't have an account?
          <span
            onClick={() => navigate("/signup")}
            className="ml-1 text-[#5865f2] cursor-pointer"
          >
            Register
          </span>
        </p> */}

        {/* Forget PIN */}
        {/* <p
          onClick={() => navigate("/forgetpin")}
          className="text-center text-[#5865f2] underline font-bold cursor-pointer"
        >
          Forgot PIN?
        </p> */}
      </Form>

    </div>
  );
}
