# React Native Styles
Refer [here](https://react-typescript-style-guide.com/#-types--interfaces)

## Folder structure
Flat --> Feature-based
Refer to README.md

## Imports
- Feature-scoped barrel files `index.ts` to group related exports
- Avoid wildcard (*) imports as they increase bundle size
- Prefer named imports for clarity and tree-shaking i.e. remove dead code/unused exports

## Component structure
- Use functional components `const MyComponent = () => { }`
- Component file names should match folder name e.g. `ProfileHero.tsx` inside `ProfileHero/`
- Single responsibility and encapsulated

### Order
1️⃣ Hooks (useState, useEffect, etc.).
2️⃣ Variables that are not functions (local variables, constants, etc.).
3️⃣ useEffect hooks (side effects).
4️⃣ Functions (event handlers, derived functions, etc.).
5️⃣ Return statement (JSX).

```tsx
export const Profile = () => {
  const navigate = useNavigate()
  const { accountHandle } = useParams()
  const { hasError, isLoading, profileData } = useGetProfileQuery(accountHandle)
  const [searchParams] = useSearchParams()
  const { id, image } = profileData ?? {}

  useEffect(() => {
    // Example: Track analytics
  }, [])

  const getProfileAvatar = () => {}

  const getProfileName = () => {}

  if (isLoading || isEmpty(profileData)) return <ProfileLoading />

  if (hasError) return <ProfileEmpty />

  return (
    <section>
      <ProfileHero />
      <div>
        <ProfileSidebar />
        <ProfileContent />
      </div>
    </section>
  )
}
```

## `use` vs `useEffect`

### `useEffect`
- Called after component renders
- E.g. fetch a user profile component

```tsx
// Example 1: Basic Data Fetching
// Traditional Approach using useState and useEffect
function UserProfilePost({ postId }: { postId: string }) {
const [post, setPost] = useState<any>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchUserPosts(userId)
    .then(data => {
    setPost(data);
    })
    .catch(err => {
    setError(err);
    })
    .finally(() => {
    setIsLoading(false);
    });
    }, [userId]);

    if (isLoading) return <div><Loading /></div>;
    if (error) return <div><Error /></div>;
    if (!post) return null;

return (
    <div>
    <h1>{post.title}</h1>
    <p>{post.author}</p>
    </div>
    );
}
```

### `use`
- Handles promises directly in components
- Reads value of a resource like a `Promise` or `context`
- 
```tsx
// Modern Approach with use()
function UserProfilePost{ postId }: { postId: string }) {
    const post= use(fetchUserPost(postId));
    return (
    <Suspense fallback=<Loading />>
    <div>
    <ErrorBoundary fallback=<Error />>
    <h1>{post.title}</h1>
    <p>{post.author}</p>
    </ErrorBoundary>
    </div>
    </Suspense>
    );
}
```
```tsx
import { use } from 'react';
// Example async function
async function fetchUserDetails(id) {
const response = await fetch(`localhost:3000/api/users/${id}`);
return response.json();
}

function UserProfile({ id }) {
// use() will suspend the component while the promise resolves
const user = use(fetchUser(id));
return <div>Hello, {user.name}!</div>;
}
```
## Styling
- Prefer `StyleSheet.create()` over inline styles