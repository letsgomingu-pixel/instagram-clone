import { Link } from 'react-router-dom';

import { Grid3X3, Bookmark, Settings, UserPlus, UserSquare2 } from 'lucide-react';

import { ReelsIcon } from '@/components/common/ReelsIcon';

import { Avatar } from '@/components/common/Avatar';

import { formatCount } from '@/utils/formatDate';

import { useAuth } from '@/hooks/useAuth';

import type { User } from '@/types';

import { cn } from '@/utils/cn';



export type ProfileTab = 'posts' | 'reels' | 'saved' | 'tagged';



interface ProfileHeaderProps {

  user: User;

  activeTab: ProfileTab;

  onTabChange: (tab: ProfileTab) => void;

  onFollow?: () => void;

}



const tabClass = (active: boolean) =>

  cn(

    'flex-1 flex items-center justify-center py-3.5 border-t transition-colors -mt-px',

    active

      ? 'border-ig-text text-ig-text'

      : 'border-transparent text-ig-text-secondary hover:text-ig-text',

  );



export function ProfileHeader({ user, activeTab, onTabChange, onFollow }: ProfileHeaderProps) {

  const { user: currentUser, isAuthenticated } = useAuth();

  const isOwn = isAuthenticated && (user.is_own_profile || user.username === currentUser?.username);



  return (

    <div className="bg-white border border-ig-border md:rounded-lg mb-4 overflow-hidden">

      <div className="px-4 md:px-8 py-6 md:py-10">

        <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">

          <div className="flex justify-center md:justify-start shrink-0">

            <Avatar

              src={user.avatar_url}

              alt={user.username}

              size="xl"

              hasStory={isOwn}

              className="h-[77px] w-[77px] md:h-[150px] md:w-[150px]"

            />

          </div>



          <div className="flex-1 min-w-0">

            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">

              <h1 className="hidden md:block text-[14px] md:text-[20px] font-normal text-center md:text-left truncate">

                {user.username}

              </h1>



              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">

                {isOwn ? (

                  <>

                    <Link

                      to="/settings/edit"

                      className="h-8 px-4 text-[14px] font-semibold rounded-lg bg-ig-secondary hover:bg-[#dbdbdb] transition-colors inline-flex items-center"

                    >

                      프로필 편집

                    </Link>

                    <button className="h-8 px-4 text-[14px] font-semibold rounded-lg bg-ig-secondary hover:bg-[#dbdbdb] transition-colors">

                      보관함

                    </button>

                    <Link

                      to="/settings"

                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-ig-secondary hover:bg-[#dbdbdb] transition-colors"

                      aria-label="설정"

                    >

                      <Settings size={16} />

                    </Link>

                  </>

                ) : !isAuthenticated ? (

                  <Link

                    to="/login"

                    className="h-8 px-4 text-[14px] font-semibold rounded-lg bg-ig-primary text-white hover:bg-ig-primary-hover inline-flex items-center"

                  >

                    로그인

                  </Link>

                ) : (

                  <>

                    <button

                      onClick={onFollow}

                      className={cn(

                        'h-8 px-4 text-[14px] font-semibold rounded-lg transition-colors inline-flex items-center gap-1',

                        user.is_following

                          ? 'bg-ig-secondary hover:bg-[#dbdbdb]'

                          : 'bg-ig-primary text-white hover:bg-ig-primary-hover',

                      )}

                    >

                      {user.is_following ? '팔로잉' : '팔로우'}

                    </button>

                    <Link

                      to={`/messages/${user.username}`}

                      className="h-8 px-4 text-[14px] font-semibold rounded-lg bg-ig-secondary hover:bg-[#dbdbdb] transition-colors inline-flex items-center"

                    >

                      메시지

                    </Link>

                    <button

                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-ig-secondary hover:bg-[#dbdbdb] transition-colors"

                      aria-label="비슷한 계정"

                    >

                      <UserPlus size={16} />

                    </button>

                  </>

                )}

              </div>

            </div>



            <div className="flex justify-center md:justify-start gap-10 md:gap-10 mb-5 text-[16px]">

              <span>

                <strong className="font-semibold">{formatCount(user.post_count)}</strong>{' '}

                <span className="font-normal">게시물</span>

              </span>

              <button type="button" className="hover:opacity-70">

                <strong className="font-semibold">{formatCount(user.follower_count)}</strong>{' '}

                <span className="font-normal">팔로워</span>

              </button>

              <button type="button" className="hover:opacity-70">

                <strong className="font-semibold">{formatCount(user.following_count)}</strong>{' '}

                <span className="font-normal">팔로잉</span>

              </button>

            </div>



            <div className="hidden md:block">

              <p className="text-[14px] font-semibold leading-[18px]">{user.full_name}</p>

              {user.bio && (

                <p className="text-[14px] whitespace-pre-line mt-1 leading-[18px]">{user.bio}</p>

              )}

              {user.website && (

                <a

                  href={user.website}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="text-[14px] text-ig-link font-semibold hover:underline mt-1 block"

                >

                  {user.website.replace(/^https?:\/\//, '')}

                </a>

              )}

            </div>

          </div>

        </div>



        <div className="md:hidden mt-4 text-center">

          <p className="text-[14px] font-semibold">{user.full_name}</p>

          {user.bio && <p className="text-[14px] whitespace-pre-line mt-1">{user.bio}</p>}

          {user.website && (

            <a

              href={user.website}

              target="_blank"

              rel="noopener noreferrer"

              className="text-[14px] text-ig-link font-semibold hover:underline mt-1 block"

            >

              {user.website.replace(/^https?:\/\//, '')}

            </a>

          )}

        </div>

      </div>



      <div className="flex border-t border-ig-border">

        <button

          onClick={() => onTabChange('posts')}

          className={tabClass(activeTab === 'posts')}

          aria-label="게시물"

        >

          <Grid3X3 size={12} className="md:mr-2" />

          <span className="hidden md:inline text-[12px] font-semibold tracking-[1px] uppercase">게시물</span>

        </button>

        <button

          onClick={() => onTabChange('reels')}

          className={tabClass(activeTab === 'reels')}

          aria-label="릴스"

        >

          <ReelsIcon size={12} filled={activeTab === 'reels'} className="md:mr-2" />

          <span className="hidden md:inline text-[12px] font-semibold tracking-[1px] uppercase">릴스</span>

        </button>

        {isOwn && (

          <button

            onClick={() => onTabChange('saved')}

            className={tabClass(activeTab === 'saved')}

            aria-label="저장됨"

          >

            <Bookmark size={12} className="md:mr-2" />

            <span className="hidden md:inline text-[12px] font-semibold tracking-[1px] uppercase">저장됨</span>

          </button>

        )}

        <button

          onClick={() => onTabChange('tagged')}

          className={tabClass(activeTab === 'tagged')}

          aria-label="태그됨"

        >

          <UserSquare2 size={12} className="md:mr-2" />

          <span className="hidden md:inline text-[12px] font-semibold tracking-[1px] uppercase">태그됨</span>

        </button>

      </div>

    </div>

  );

}


