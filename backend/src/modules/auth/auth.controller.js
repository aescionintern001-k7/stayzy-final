import {
  registerUser,
  loginUser,
  googleLoginUser,
  refreshUserSession,
  logoutUserSession,
  requestPasswordReset,
  resetPasswordWithToken,
} from "./auth.service.js";

export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    res.set("Cache-Control", "no-store, private");
    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    res.set("Cache-Control", "no-store, private");
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const result = await googleLoginUser(req.body);

    res.set("Cache-Control", "no-store, private");
    res.status(200).json({
      success: true,
      message: "Google sign-in successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const result = await refreshUserSession(req.body);

    res.set("Cache-Control", "no-store, private");
    res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const result = await logoutUserSession({
      userId: req.user?.id || null,
      refresh_token: req.body?.refresh_token || null,
    });

    res.set("Cache-Control", "no-store, private");
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const result = await requestPasswordReset(req.body);

    res.set("Cache-Control", "no-store, private");
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const result = await resetPasswordWithToken(req.body);

    res.set("Cache-Control", "no-store, private");
    res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = (req, res) => {
  res.set("Cache-Control", "no-store, private");
  res.status(200).json({
    success: true,
    message: "Authenticated user profile",
    data: {
      user: req.user,
    },
  });
};
