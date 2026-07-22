import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { UserModel } from '../models/User.js';

const router = Router();

function formatUserResponse(user: any) {
  return {
    id:         user.userId,
    email:      user.email,
    role:       user.role,
    name:       user.name,
    department: user.department,
    ...(user.rollNumber && { rollNumber: user.rollNumber }),
    ...(user.semester   && { semester:   user.semester   }),
    ...(user.avatarUrl  && { avatarUrl:  user.avatarUrl  }),
    ...(user.phone      && { phone:      user.phone      }),
    ...(user.dob        && { dob:        user.dob        }),
    ...(user.gender     && { gender:     user.gender     }),
    ...(user.address    && { address:    user.address    }),
  };
}

/**
 * GET /api/users/faculty
 * Returns list of faculty members in MongoDB.
 */
router.get('/faculty', verifyToken, async (req: Request, res: Response) => {
  try {
    const docs = await UserModel.find({ role: 'faculty' }).lean();
    res.json({ faculty: docs.map(formatUserResponse) });
  } catch (err) {
    console.error('GET /users/faculty error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/users/me
 * Returns current user profile from MongoDB.
 */
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findOne({ userId: req.user!.id }).lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: formatUserResponse(user) });
  } catch (err) {
    console.error('GET /users/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/users/me
 * Updates current user personal info and saves to MongoDB.
 * Body: { name?, email?, phone?, dob?, gender?, address?, avatarUrl?, password?, currentPassword? }
 */
router.put('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findOne({ userId: req.user!.id });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const {
      name,
      email,
      phone,
      dob,
      gender,
      address,
      avatarUrl,
      password,
      currentPassword,
    } = req.body;

    // Handle password change if currentPassword & password are provided
    if (password) {
      if (currentPassword && user.password !== currentPassword) {
        res.status(400).json({ error: 'Current password does not match' });
        return;
      }
      user.password = password;
    }

    if (name !== undefined)      user.name = name;
    if (email !== undefined)     user.email = email;
    if (phone !== undefined)     user.phone = phone;
    if (dob !== undefined)       user.dob = dob;
    if (gender !== undefined)    user.gender = gender;
    if (address !== undefined)   user.address = address;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    res.json({ user: formatUserResponse(user) });
  } catch (err) {
    console.error('PUT /users/me error:', err);
    res.status(500).json({ error: 'Failed to update personal information' });
  }
});

export default router;
