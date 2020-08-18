type Resolver<T> = (value?: T | PromiseLike<T> | undefined) => void;
type Rejecter = (reason?: any) => void;
type Executor<T> = (resolve: Resolver<T>, reject: Rejecter) => void;

class TimeoutPromise<T> extends Promise<T> {

	public constructor(executor: Executor<T>, timeout?: number) {
		super(TimeoutPromise.create(executor, timeout));
	}

	private static decorateResolver<T>(resolve: (value?: T | PromiseLike<T> | undefined) => void, timer: NodeJS.Timeout): Resolver<T> {
		return (value?: T | PromiseLike<T> | undefined) => {
			if (timer) {
				clearTimeout(timer);
			}
			resolve(value);
		};
	}

	private static decorateRejecter(reject: Rejecter, timer: NodeJS.Timeout): Rejecter {
		return (reason?: any) => {
			if (timer) {
				clearTimeout(timer);
			}
			reject(reason);
		};
	}

	private static create<T>(executor: Executor<T>, timeout?: number): Executor<T> {
		return async (resolve: (value?: T | PromiseLike<T> | undefined) => void,
			reject: (reason?: any) => void) => {
	
			let timer: NodeJS.Timeout | null = null;
				
			if (timeout !== undefined) {
				timer = setTimeout(reject, timeout, "Timeout error");
			}

			resolve = this.decorateResolver(resolve, timer);
			reject = this.decorateRejecter(reject, timer);
				
			try {
				executor(resolve, reject);
			}
			catch (e) {
				reject(e);
			}
		};
	}
}

export { TimeoutPromise };
