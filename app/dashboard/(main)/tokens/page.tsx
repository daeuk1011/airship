import { db } from "@/shared/libs/db";
import { apiTokens } from "@/shared/libs/db/schema";
import { desc } from "drizzle-orm";
import { Card, CardList } from "@/shared/ui/card";
import { timeAgo, formatAbsolute } from "@/shared/utils/time";
import { CreateTokenForm } from "@/features/tokens/components/create-token-form";
import { DeleteTokenButton } from "@/features/tokens/components/delete-token-button";

export const dynamic = "force-dynamic";

export default function TokensPage() {
  const tokens = db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .orderBy(desc(apiTokens.createdAt))
    .all();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">API Tokens</h1>

      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
          Create Token
        </h2>
        <CreateTokenForm />
      </Card>

      <h2 className="text-lg font-semibold mb-3">
        Active Tokens ({tokens.length})
      </h2>

      {tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground/20 mb-3"
          >
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <p className="text-foreground/50 text-sm">No API tokens</p>
          <p className="text-foreground/30 text-xs mt-1">
            Create a token to authenticate API requests
          </p>
        </div>
      ) : (
        <CardList>
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="text-sm font-medium">{token.name}</p>
                <p className="text-xs text-foreground/40">
                  Created{" "}
                  <span title={formatAbsolute(token.createdAt)}>
                    {timeAgo(token.createdAt)}
                  </span>
                  {token.lastUsedAt && (
                    <>
                      {" "}
                      &middot; Last used{" "}
                      <span title={formatAbsolute(token.lastUsedAt)}>
                        {timeAgo(token.lastUsedAt)}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <DeleteTokenButton tokenId={token.id} tokenName={token.name} />
            </div>
          ))}
        </CardList>
      )}
    </div>
  );
}
