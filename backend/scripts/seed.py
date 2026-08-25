"""Frontend mockData.ts 기준 시드 데이터"""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import bcrypt
from sqlalchemy import delete, func, select

from app.database import SessionLocal
from app.db_init import init_db
from app.utils.media import create_seed_image
from app.models import (
    Comment,
    Conversation,
    Follow,
    Like,
    Message,
    Notification,
    Post,
    PostTag,
    Reel,
    ReelLike,
    SavedPost,
    Story,
    StoryItem,
    StoryView,
    User,
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def hours_ago(hours: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours)


def minutes_ago(minutes: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=minutes)


def avatar(seed: str) -> str:
    return f"https://i.pravatar.cc/150?u={seed}"


def image(seed: str, w: int = 600, h: int = 600) -> str:
    return create_seed_image(seed, "posts", w, h)


def reel_image(seed: str) -> str:
    return create_seed_image(seed, "reels", 720, 1280)


def conversation_pair(user_a: int, user_b: int) -> tuple[int, int]:
    return (user_a, user_b) if user_a < user_b else (user_b, user_a)


USERS = [
    {
        "username": "letsgomingu",
        "email": "letsgomingu@gmail.com",
        "password": "12345",
        "full_name": "민구",
        "bio": "📸 사진과 여행을 사랑합니다\n✈️ 서울, 대한민국",
        "website": "https://example.com",
        "avatar": "letsgomingu",
    },
    {
        "username": "alice_kim",
        "email": "alice@example.com",
        "password": "12345",
        "full_name": "김앨리스",
        "bio": "커피를 사랑하는 사람 ☕",
        "avatar": "alice",
    },
    {
        "username": "bob_lee",
        "email": "bob@example.com",
        "password": "12345",
        "full_name": "이준호",
        "bio": "개발자 & 사진작가",
        "avatar": "bob",
    },
    {
        "username": "sarah_park",
        "email": "sarah@example.com",
        "password": "12345",
        "full_name": "박사라",
        "bio": "패션 & 라이프스타일",
        "avatar": "sarah",
    },
    {
        "username": "mike_jung",
        "email": "mike@example.com",
        "password": "12345",
        "full_name": "정민수",
        "bio": "피트니스 매니아 💪",
        "avatar": "mike",
    },
    {
        "username": "emma_cho",
        "email": "emma@example.com",
        "password": "12345",
        "full_name": "조예림",
        "bio": "아티스트 🎨",
        "avatar": "emma",
    },
]


def clear_all(db) -> None:
    for model in (
        Notification,
        Message,
        Conversation,
        StoryView,
        StoryItem,
        Story,
        ReelLike,
        Reel,
        PostTag,
        SavedPost,
        Like,
        Comment,
        Post,
        Follow,
        User,
    ):
        db.execute(delete(model))
    db.commit()


def seed(reset: bool = False) -> None:
    init_db()
    db = SessionLocal()

    try:
        existing = db.scalar(select(func.count()).select_from(User))
        if existing and not reset:
            print(f"[OK] Database already seeded ({existing} users). Use --reset to re-seed.")
            return

        if reset:
            clear_all(db)

        user_by_username: dict[str, User] = {}
        for data in USERS:
            user = User(
                username=data["username"],
                email=data["email"],
                password_hash=hash_password(data["password"]),
                full_name=data["full_name"],
                bio=data.get("bio"),
                website=data.get("website"),
                avatar_url=avatar(data["avatar"]),
            )
            db.add(user)
            db.flush()
            user_by_username[data["username"]] = user

        u = user_by_username
        me = u["letsgomingu"]

        # Follows (letsgomingu → alice, bob, mike)
        for following in ("alice_kim", "bob_lee", "mike_jung"):
            db.add(Follow(follower_id=me.id, following_id=u[following].id))

        # mockData.ts posts[] — user 필드와 동일
        posts_data = [
            ("alice_kim", "post1", "오늘의 카페 ☕ #커피 #서울 #일상", "서울, 대한민국", 3, 1243, 89, ["letsgomingu"]),
            ("bob_lee", "post2", "골든아워의 마법 🌅", None, 5, 892, 45, []),
            ("mike_jung", "post3", "새 컬렉션 곧 공개 예정 👗✨", "서울 강남", 8, 5621, 234, ["letsgomingu", "alice_kim"]),
            ("emma_cho", "post4", "아침 운동 완료 💪 #피트니스 #동기부여", None, 12, 2341, 67, ["letsgomingu"]),
            ("alice_kim", "post5", "주말 분위기 🌸", None, 24, 756, 32, []),
            ("sarah_park", "post6", "도시의 불빛 🌃", None, 36, 1890, 78, []),
            ("emma_cho", "post7", "자연 테라피 🌿", None, 48, 3210, 112, []),
            ("mike_jung", "post8", "여름 컬렉션 미리보기 ☀️", None, 72, 8900, 456, []),
            ("letsgomingu", "post9", "Instagram 클론 첫 게시물! 🎉", None, 1, 42, 5, []),
        ]

        post_by_index: dict[int, Post] = {}
        for idx, (username, seed_key, caption, location, hours, likes, comments_count, tags) in enumerate(
            posts_data, start=1
        ):
            post = Post(
                user_id=u[username].id,
                image_url=image(seed_key),
                caption=caption,
                location=location,
                like_count=likes,
                comment_count=comments_count,
                created_at=hours_ago(hours),
            )
            db.add(post)
            db.flush()
            post_by_index[idx] = post
            for tag_username in tags:
                db.add(PostTag(post_id=post.id, user_id=u[tag_username].id))

        # Comments
        comments_data = [
            (1, "alice_kim", "정말 멋진 사진이에요! 😍", 2),
            (1, "bob_lee", "어디서 찍으셨어요?", 1),
            (3, "mike_jung", "색감이 너무 예뻐요 ✨", 5),
            (3, "emma_cho", "멋진 사진이에요! 🔥", 3),
            (3, "alice_kim", "다음에 같이 가요!", 8),
            (9, "bob_lee", "축하해요! 🎉", 1),
        ]
        for post_idx, author, content, hours in comments_data:
            db.add(
                Comment(
                    post_id=post_by_index[post_idx].id,
                    user_id=u[author].id,
                    content=content,
                    created_at=hours_ago(hours),
                )
            )

        # Likes by letsgomingu
        for post_idx in (1, 3, 5, 7):
            db.add(Like(user_id=me.id, post_id=post_by_index[post_idx].id))

        # Saved by letsgomingu
        for post_idx in (2, 6):
            db.add(SavedPost(user_id=me.id, post_id=post_by_index[post_idx].id))

        # Reels
        reels_data = [
            ("letsgomingu", "reel1", "서울 야경 릴스 🌃 #서울 #릴스", "Original audio · letsgomingu", 2, 8420, 124, 45200, True),
            ("letsgomingu", "reel2", "주말 브이로그 ✨", "Trending Song · Artist", 12, 3210, 56, 18900, False),
            ("letsgomingu", "reel3", "카페 투어 ☕", "Lo-fi Beats · ChillHop", 24, 1560, 34, 9800, False),
            ("alice_kim", "reel4", "오늘의 OOTD 👗", "Fashion Vibes · DJ Mix", 4, 12400, 289, 89200, True),
            ("mike_jung", "reel5", "새 컬렉션 티저", "Runway · Original", 6, 45600, 1200, 320000, False),
            ("emma_cho", "reel6", "운동 루틴 💪", "Workout Mix · Fitness", 10, 8900, 167, 56000, False),
        ]
        reel_by_index: dict[int, Reel] = {}
        for idx, (username, seed_key, caption, audio, hours, likes, comments, views, liked_by_me) in enumerate(
            reels_data, start=1
        ):
            reel = Reel(
                user_id=u[username].id,
                thumbnail_url=reel_image(seed_key),
                caption=caption,
                audio_name=audio,
                like_count=likes,
                comment_count=comments,
                view_count=views,
                created_at=hours_ago(hours),
            )
            db.add(reel)
            db.flush()
            reel_by_index[idx] = reel
            if liked_by_me:
                db.add(ReelLike(user_id=me.id, reel_id=reel.id))

        # Stories
        stories_data = [
            ("letsgomingu", False, [("story1", 1), ("story1b", 1)]),
            ("alice_kim", False, [("story2", 2)]),
            ("bob_lee", True, [("story3", 4)]),
            ("mike_jung", False, [("story4", 6), ("story4b", 6), ("story4c", 6)]),
            ("emma_cho", True, [("story5", 8)]),
            ("sarah_park", False, [("story6", 10)]),
        ]
        for username, viewed_by_me, items in stories_data:
            story = Story(
                user_id=u[username].id,
                expires_at=hours_ago(-20),
                created_at=hours_ago(items[0][1]),
            )
            db.add(story)
            db.flush()
            for item_seed, item_hours in items:
                db.add(
                    StoryItem(
                        story_id=story.id,
                        image_url=image(item_seed, 400, 700),
                        created_at=hours_ago(item_hours),
                    )
                )
            if viewed_by_me:
                db.add(StoryView(user_id=me.id, story_id=story.id))

        # Conversations (letsgomingu ↔ others)
        conv_specs = [
            ("alice_kim", [
                ("alice_kim", "안녕하세요! 오늘 카페 사진 너무 예뻐요 ☕", 5, True),
                ("letsgomingu", "감사합니다! 강남역 근처예요", 4, True),
                ("alice_kim", "위치 알려주실 수 있나요?", 3, True),
                ("letsgomingu", "네, DM으로 보내드릴게요!", 2, True),
            ]),
            ("bob_lee", [
                ("bob_lee", "골든아워 사진 촬영 팁 좀 알려주세요", 24, True),
                ("letsgomingu", "일몰 30분 전이 제일 좋아요 🌅", 23, True),
                ("bob_lee", "와 감사합니다! 이번 주말에 도전해볼게요", 22, True),
            ]),
            ("mike_jung", [
                ("mike_jung", "새 컬렉션 촬영 같이 하실래요?", 48, True),
                ("letsgomingu", "좋아요! 일정 맞춰봐요", 47, True),
                ("mike_jung", "이번 주 토요일은 어떠세요?", 35 / 60, False),
            ]),
            ("emma_cho", [
                ("emma_cho", "전시회 초대장 보냈어요 🎨", 72, True),
                ("letsgomingu", "꼭 갈게요!", 71, True),
            ]),
        ]

        for participant, messages in conv_specs:
            u1, u2 = conversation_pair(me.id, u[participant].id)
            conv = Conversation(user1_id=u1, user2_id=u2, updated_at=hours_ago(messages[-1][2]))
            db.add(conv)
            db.flush()
            for sender_name, content, time_val, is_read in messages:
                created = hours_ago(time_val) if time_val >= 1 else minutes_ago(time_val * 60)
                db.add(
                    Message(
                        conversation_id=conv.id,
                        sender_id=u[sender_name].id,
                        content=content,
                        is_read=is_read,
                        created_at=created,
                    )
                )

        # Notifications (recipient = letsgomingu for 'you' tab)
        # mockNotifications.ts initialNotifications — actor·post_id 동일
        notifications_data = [
            ("you", "like", "alice_kim", 3, None, minutes_ago(12), False),
            ("you", "comment", "bob_lee", 3, "정말 멋진 사진이에요! 😍", minutes_ago(45), False),
            ("you", "follow", "sarah_park", None, None, hours_ago(2), False),
            ("you", "like", "mike_jung", 3, None, hours_ago(3), True),
            ("you", "comment", "emma_cho", 1, "색감이 너무 예뻐요 ✨", hours_ago(5), True),
            ("you", "follow", "emma_cho", None, None, hours_ago(8), True),
            ("you", "like", "bob_lee", 2, None, hours_ago(12), True),
            ("you", "comment", "alice_kim", 3, "다음에 같이 가요!", hours_ago(18), True),
            ("you", "follow", "alice_kim", None, None, hours_ago(24), True),
            ("following", "like", "alice_kim", 2, None, minutes_ago(30), False),
            ("following", "comment", "mike_jung", 1, "여기 분위기 너무 좋다!", hours_ago(1), False),
            ("following", "like", "bob_lee", 3, None, hours_ago(4), True),
            ("following", "comment", "emma_cho", 2, "완전 예쁘다 ✨", hours_ago(10), True),
            ("following", "like", "sarah_park", 4, None, hours_ago(30), True),
        ]

        for tab, ntype, actor, post_idx, preview, created_at, is_read in notifications_data:
            db.add(
                Notification(
                    recipient_id=me.id,
                    actor_id=u[actor].id,
                    type=ntype,
                    tab=tab,
                    post_id=post_by_index[post_idx].id if post_idx else None,
                    comment_preview=preview,
                    is_read=is_read,
                    created_at=created_at,
                )
            )

        db.commit()
        print("[OK] Seed completed")
        print(f"   Users: {len(USERS)}")
        print(f"   Posts: {len(posts_data)}")
        print(f"   Reels: {len(reels_data)}")
        print(f"   Stories: {len(stories_data)}")
        print(f"   Conversations: {len(conv_specs)}")
        print(f"   Notifications: {len(notifications_data)}")
        print("   Test login: letsgomingu@gmail.com / 12345")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Clear existing data before seeding")
    args = parser.parse_args()
    seed(reset=args.reset)
