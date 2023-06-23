import { clerkClient } from "@clerk/nextjs";
import { User } from "@clerk/nextjs/dist/types/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";



const filterUserForClient = (user: User) => {

  return {id: user.id, username:user.username, profilePicture:user.profileImageUrl
  }
  
  
}

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,

});


export const postsRouter = createTRPCRouter({
  
  getAll: publicProcedure.query(async({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take:100,
      orderBy: {
        createdAt: "desc"
      }
      
    });

    const users = (await clerkClient.users.getUserList({
      userId: posts.map((post) => post.authorId),
      limit:100
    })
    ).map(filterUserForClient)

  

    


    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId)

      if (!author || !author.username) throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message:"Author for post not foun!",
    })
      
      return { 
      post,
      author,
      }

})
}),

create: privateProcedure.input(z.object({
  content: z.string().emoji().min(1).max(200)
})).mutation(async ({ctx, input}) => {

const authorId = ctx.userId
const {success} = await ratelimit.limit(authorId)

if (!success) throw new TRPCError({
  code: "TOO_MANY_REQUESTS"
})

const post = await ctx.prisma.post.create({
  data:{
    authorId,
    content: input.content,
  }
})

return post

}),

})