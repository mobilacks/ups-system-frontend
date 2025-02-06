const handleAuth = async (event) => {
  event.preventDefault();
  setError(null);
  setLoading(true);

  // Validate email domain
  if (!email.endsWith("@lacksvalley.com")) {
    setError("You must use a valid Lacks email address");
    setLoading(false);
    return;
  }

  // Validate store number
  const storeNum = parseInt(storeNumber, 10);
  if (isNaN(storeNum) || storeNum <= 0) {
    setError("Please enter a valid store number.");
    setLoading(false);
    return;
  }

  try {
    if (isSignUp) {
      // Sign up user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      console.log("✅ Signup Success:", signUpData);

      // Insert user into agents table
      const { data: agentData, error: agentError } = await supabase.from("agents").insert([
        {
          email,
          name,
          store_number: storeNum,
          role: "agent",
          status: "offline",
        },
      ]);

      if (agentError) throw agentError;

      console.log("✅ Agent Inserted:", agentData);
    } else {
      // Log in user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
    }
  } catch (err) {
    console.error("🚨 Error:", err.message);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
