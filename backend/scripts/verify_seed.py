"""Verify seed data aligns with frontend mockData.ts / mockMessages.ts / mockNotifications.ts."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Conversation, Message, Notification, Post, Reel, Story, User


# mockData.ts posts[].user.username (by post id 1..9)
EXPECTED_POST_OWNERS = {
    1: "alice_kim",
    2: "bob_lee",
    3: "mike_jung",
    4: "emma_cho",
    5: "alice_kim",
    6: "sarah_park",
    7: "emma_cho",
    8: "mike_jung",
    9: "letsgomingu",
}

# mockData.ts reels[].user.username (by reel id 1..6)
EXPECTED_REEL_OWNERS = {
    1: "letsgomingu",
    2: "letsgomingu",
    3: "letsgomingu",
    4: "alice_kim",
    5: "mike_jung",
    6: "emma_cho",
}

# mockMessages.ts conversation participants (letsgomingu's DM partners)
EXPECTED_CONV_PARTNERS = {"alice_kim", "bob_lee", "mike_jung", "emma_cho"}

# mockNotifications.ts actor usernames in order (id 1..14)
EXPECTED_NOTIFICATION_ACTORS = [
    "alice_kim",
    "bob_lee",
    "sarah_park",
    "mike_jung",
    "emma_cho",
    "emma_cho",
    "bob_lee",
    "alice_kim",
    "alice_kim",
    "alice_kim",
    "mike_jung",
    "bob_lee",
    "emma_cho",
    "sarah_park",
]


def main() -> None:
    db = SessionLocal()
    errors: list[str] = []

    try:
        me = db.scalar(select(User).where(User.username == "letsgomingu"))
        if not me:
            print("[FAIL] letsgomingu user not found - run seed first")
            sys.exit(1)

        posts = db.scalars(select(Post).order_by(Post.id)).all()
        for post in posts:
            owner = db.get(User, post.user_id)
            expected = EXPECTED_POST_OWNERS.get(post.id)
            if owner.username != expected:
                errors.append(f"post {post.id}: owner {owner.username}, expected {expected}")

        reels = db.scalars(select(Reel).order_by(Reel.id)).all()
        for reel in reels:
            owner = db.get(User, reel.user_id)
            expected = EXPECTED_REEL_OWNERS.get(reel.id)
            if owner.username != expected:
                errors.append(f"reel {reel.id}: owner {owner.username}, expected {expected}")

        stories = db.scalars(select(Story).order_by(Story.id)).all()
        expected_story_owners = ["letsgomingu", "alice_kim", "bob_lee", "mike_jung", "emma_cho", "sarah_park"]
        for story, expected in zip(stories, expected_story_owners, strict=True):
            owner = db.get(User, story.user_id)
            if owner.username != expected:
                errors.append(f"story {story.id}: owner {owner.username}, expected {expected}")

        convs = db.scalars(
            select(Conversation).where(
                (Conversation.user1_id == me.id) | (Conversation.user2_id == me.id)
            )
        ).all()
        partners = set()
        for conv in convs:
            other_id = conv.user2_id if conv.user1_id == me.id else conv.user1_id
            other = db.get(User, other_id)
            partners.add(other.username)
        if partners != EXPECTED_CONV_PARTNERS:
            errors.append(f"conversation partners {sorted(partners)}, expected {sorted(EXPECTED_CONV_PARTNERS)}")

        sarah_conv = next(
            (
                c
                for c in convs
                if db.get(User, c.user2_id if c.user1_id == me.id else c.user1_id).username == "mike_jung"
            ),
            None,
        )
        if sarah_conv:
            unread = db.scalar(
                select(Message)
                .where(
                    Message.conversation_id == sarah_conv.id,
                    Message.sender_id != me.id,
                    Message.is_read.is_(False),
                )
                .limit(1)
            )
            if not unread:
                errors.append("mike_jung conversation should have 1 unread message from mockMessages.ts")

        notifications = db.scalars(
            select(Notification)
            .where(Notification.recipient_id == me.id)
            .order_by(Notification.id)
        ).all()
        if len(notifications) != len(EXPECTED_NOTIFICATION_ACTORS):
            errors.append(
                f"notification count {len(notifications)}, expected {len(EXPECTED_NOTIFICATION_ACTORS)}"
            )
        else:
            for n, expected_actor in zip(notifications, EXPECTED_NOTIFICATION_ACTORS, strict=True):
                actor = db.get(User, n.actor_id)
                if actor.username != expected_actor:
                    errors.append(
                        f"notification {n.id}: actor {actor.username}, expected {expected_actor}"
                    )

        if errors:
            print("[FAIL] Seed verification failed:")
            for err in errors:
                print(f"  - {err}")
            sys.exit(1)

        print("[OK] Seed data matches frontend mock (posts, reels, stories, DMs, notifications)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
